import { Fiber, transformVdomToFiber } from './fiber'

export type FunctionElementType = (props: PropsType) => VDOMElement
export type ElementType = string | FunctionElementType
export type PropsType = Record<string, any> & { children: ChildType[] }
export type ChildType = VDOMElement | string
export type VDOMElement = {
  type: ElementType
  props: PropsType
}

const TEXT_ELEMENT = 'TEXT_ELEMENT'

export const createElement = (
  type: ElementType,
  props: PropsType,
  ...children: ChildType[]
): VDOMElement => ({
  type: type,
  props: {
    ...props,
    children: children.map((child) =>
      // todo support children
      typeof child === 'string' || typeof child === 'number'
        ? createText(child)
        : child
    ),
  },
})

export const createText = (text: string): VDOMElement => ({
  type: TEXT_ELEMENT,
  props: {
    nodeValue: text,
    children: [],
  },
})

export const render = (el: VDOMElement, container: HTMLElement): void => {
  nextWorOfUnit = transformVdomToFiber(
    {
      type: () => el,
      props: {
        children: [],
      },
    },
    container
  )
  root = nextWorOfUnit
  // 推入构造环节
  requestIdleCallback(workLoop)
}

let nextWorOfUnit: null | Fiber = null
let root: Fiber | null = null
const workLoop: IdleRequestCallback = (deadline) => {
  let shouldYield = false

  while (!shouldYield && nextWorOfUnit) {
    // * 一边构建链表，一边构造dom
    nextWorOfUnit = performWorkOfUnit(nextWorOfUnit)
    shouldYield = deadline.timeRemaining() < 1
  }

  // * 统一提交
  // * 只需要提交一次，随后不需要提交了，所以 root 需要在本次提交后，设置为 null
  if (!nextWorOfUnit && root) {
    commitRoot(root)
  }
  requestIdleCallback(workLoop)
}

const createDom = (type: ElementType) => {
  return type === TEXT_ELEMENT
    ? document.createTextNode('')
    : document.createElement(type as string)
}
const updateProps = (props: PropsType, dom: HTMLElement | Text) => {
  Object.keys(props).forEach((k) => {
    if (k !== 'children') {
      ;(dom as any)[k] = props[k]
    }
  })
}

const bindFiberTree = (fiber: Fiber, children: ChildType[]) => {
  let prevChild: Fiber | null = null
  children.forEach((child, index) => {
    if (child && typeof child !== 'string') {
      // * 创建新的 fiber 节点
      const newFiber = new Fiber({
        ...transformVdomToFiber(child, null),
        parent: fiber,
      })
      // * 第一个节点，那么，父节点的 child 应该指向她
      // * 否则， 则前序节点的 sibling 指向当前节点
      if (index === 0) {
        fiber.child = newFiber
      } else {
        prevChild!.sibling = newFiber
      }
      prevChild = newFiber
    }
  })
}

const commitRoot = (fiber: Fiber) => {
  commitWork(fiber.child)
  // * 提交完成后， 设置为 null
  root = null
}

// * 递归进去 提交 child 和 sibling
const commitWork = (fiber: Fiber | null) => {
  if (!fiber) {
    return
  }
  let parent = fiber.parent
  while (parent && !parent.dom) {
    parent = parent.parent
  }
  if (fiber.dom) {
    // @ts-expect-error Text does't have this method
    parent?.dom?.append(fiber.dom)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

const updateFunctionComponent = (fiber: Fiber) => {
  const children: ChildType[] = [(fiber.type as FunctionElementType)(fiber.props)]
  return children
}
const updateHostComponent = (fiber: Fiber) => {
  const { type, props } = fiber
  if (!fiber.dom) {
    const dom = (fiber.dom = createDom(type))
    // * 处理 props
    updateProps(props, dom)
  }
  const children: ChildType[] = fiber.props.children

  return children
}

const performWorkOfUnit = (fiber: Fiber) => {
  const isFunctionComponent = typeof fiber.type === 'function'
  // * 1. 创建 dom & 处理 propss
  // * 如果 dom 存在，则代表是 入口container，不需要创建，开始处理子节点即可
  let children: ChildType[]
  if (isFunctionComponent) {
    children = updateFunctionComponent(fiber)
  } else {
    children = updateHostComponent(fiber)
  } 
  // * 2. 绑定 指针指向
  bindFiberTree(fiber, children)

  // * 3. 返回
  // * 此时的优先级为
  // *    1. 孩子节点
  // *    2. 兄弟节点
  // *    3. ”叔叔“ 节点， 也可以是 ”曾叔叔“, ......, ”祖先叔叔“
  if (fiber.child) {
    return fiber.child
  }
  let next: Fiber | null = fiber
  while (next) {
    // * 如果 sibling 存在，则返回sibling
    if (next.sibling) {
      return next.sibling
    }
    // * 否则，继续往上寻找 parent 的 sibling
    next = next.parent
  }
  return null
}

const React = {
  createElement,
  createText,
  render,
}

export default React
