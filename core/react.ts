import { Fiber, Tag, transformVdomToFiber } from './fiber'

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
  wipRoot = nextWorOfUnit
  // 推入构造环节
  requestIdleCallback(workLoop)
}

let nextWorOfUnit: null | Fiber = null
let wipRoot: Fiber | null = null
let currentRoot: Fiber | null = null
const workLoop: IdleRequestCallback = (deadline) => {
  let shouldYield = false
  while (!shouldYield && nextWorOfUnit) {
    // * 一边构建链表，一边构造dom
    nextWorOfUnit = performWorkOfUnit(nextWorOfUnit)
    shouldYield = deadline.timeRemaining() < 1
  }

  // * 统一提交 dom 更新
  // * 只需要提交一次，随后不需要提交了，所以 root 需要在本次提交后，设置为 null
  if (!nextWorOfUnit && wipRoot) {
    commitRoot(wipRoot)
  }
  requestIdleCallback(workLoop)
}

export const update = () => {
  wipRoot = new Fiber({
    ...currentRoot!,
    dom: currentRoot!.dom,
    props: currentRoot!.props,
    alternate: currentRoot,
  })
  nextWorOfUnit = wipRoot
}

const createDom = (type: ElementType) => {
  return type === TEXT_ELEMENT
    ? document.createTextNode('')
    : document.createElement(type as string)
}
const updateProps = (dom: HTMLElement | Text, nextProps: PropsType, prevProps?: PropsType) => {
  // * 1. old 有， new 没有 -> 删除
  if (prevProps) {
    Object.keys(prevProps).forEach((k) => {
      if (k !== 'children') {
        if (!(k in nextProps)) {
          (dom as HTMLElement).removeAttribute(k)
        }
      }
    })
  }
  // * 2. old 没有， new 有 -> 添加
  // * 3. old 有， new 有 -> 替换
  Object.keys(nextProps).forEach(k => {
    if (k !== 'children') {
      if (prevProps?.[k] !== nextProps[k]) {
        if (k.startsWith("on")) {
          const eventType = k.slice(2).toLowerCase();
          dom.removeEventListener(eventType, prevProps?.[k]);
          dom.addEventListener(eventType, nextProps[k]);
        } else {
          (dom as any)[k] = nextProps[k]
        }
      }
    }
  })
}

const reconcileChildren = (fiber: Fiber, children: ChildType[]) => {
  let prevChild: Fiber | null = null
  let oldFiber = fiber.alternate?.child
  children.forEach((child, index) => {
    if (child && typeof child !== 'string') {

      // * 如果标签类型相同，则代表是 更新阶段
      const isSameType = oldFiber && oldFiber.type === child.type
      let newFiber: Fiber

      if (isSameType) {
        newFiber = new Fiber({
          ...transformVdomToFiber(child, oldFiber!.dom),
          tag: Tag.UPDATE,
          alternate: oldFiber!,
          parent: fiber,
        })
      } else {
        // * 创建新的 fiber 节点
        newFiber = new Fiber({
          ...transformVdomToFiber(child, null),
          parent: fiber,
        })
      }

      if (oldFiber) {
        oldFiber = oldFiber.sibling
      }

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
  currentRoot = wipRoot
  wipRoot = null
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

  if (fiber.tag === Tag.PLACEMENT) {
    if (fiber.dom) {
      // @ts-expect-error Text does't have this method
      parent?.dom?.append(fiber.dom)
    }
  } else {
    // * 更新阶段不需要创建 dom，只需要更新 props 等修改dom
    updateProps(fiber.dom!, fiber.props, fiber.alternate?.props)
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
    updateProps(dom, props, {
      children: []
    })
  }
  const children: ChildType[] = fiber.props.children

  return children
}

const performWorkOfUnit = (fiber: Fiber) => {
  const isFunctionComponent = typeof fiber.type === 'function'
  // * 1. 创建 dom & 处理 props
  // * 如果 dom 存在，则代表是 入口container，不需要创建，开始处理子节点即可
  let children: ChildType[]
  if (isFunctionComponent) {
    children = updateFunctionComponent(fiber)
  } else {
    children = updateHostComponent(fiber)
  }
  // * 2. 绑定 指针指向, 构建 fiber 树
  reconcileChildren(fiber, children)

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
