import { Update } from 'vite/types/hmrPayload.js'
import { EffectAction, EffectHook, Fiber, StateHook, Tag, UpdateAction, transformVdomToFiber } from './fiber'

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
  nextWorkOfUnit = transformVdomToFiber(
    {
      type: () => el,
      props: {
        children: [],
      },
    },
    container
  )
  wipRoot = nextWorkOfUnit
  // 推入构造环节
  requestIdleCallback(workLoop)
}

let nextWorkOfUnit: null | Fiber = null
// * work in process
let wipRoot: Fiber | null = null
let currentRoot: Fiber | null = null
let deletions: Array<Fiber | null> = []
let wipFiber: Fiber | null = null
const workLoop: IdleRequestCallback = (deadline) => {
  let shouldYield = false
  while (!shouldYield && nextWorkOfUnit) {
    // * 一边构建链表，一边构造dom
    nextWorkOfUnit = performWorkOfUnit(nextWorkOfUnit)

    // * 找到更新的边界点，也就是只需要更新当前 wipFiber ，其他节点不需要更新
    // * wipRoot 就是当前需要更新的 fiber， nextWorkOfUnit下一个 workLoop 需要更新的 fiber
    // * 这里的判断条件是，如果 wipRoot 的 sibling 和 nextWorkOfUnit 的 type 相同，则代表当前的 fiber 节点，及其子节点已经构建完毕，接下来是下一个 FC， 那么就不需要更新了
    if (wipRoot?.sibling?.type === nextWorkOfUnit?.type) {
      // * 设置为 null，下面会走到 commitRoot， 提交更新
      nextWorkOfUnit = null
    }

    shouldYield = deadline.timeRemaining() < 1
  }

  // * 统一提交 dom 更新
  // * 只需要提交一次，随后不需要提交了，所以 root 需要在本次提交后，设置为 null -> 在 commitRoot 中去设置
  if (!nextWorkOfUnit && wipRoot) {
    commitRoot(wipRoot)
  }
  requestIdleCallback(workLoop)
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
// * 更新阶段的话，其实有三种情况
// * 1. 新增节点，旧节点没有，新节点有
// * 2. 删除节点，旧节点有，新节点没有
// * 3. 更新节点，旧节点有，新节点有，但是不一样
// * 其中，1， 3可以合并，因为本质都是更新，只不过新增的时候是旧节点可以理解我为undefined
const reconcileChildren = (fiber: Fiber, children: ChildType[]) => {
  let prevChild: Fiber | null = null
  let oldFiber = fiber.alternate?.child
  children.forEach((child, index) => {
    if (child && typeof child !== 'string') {

      // * 如果标签类型相同，则代表是 更新阶段
      const isSameType = oldFiber && oldFiber.type === child.type
      let newFiber: Fiber

      if (isSameType) {
        // * 1， 3 如果标签类型相同，则代表是更新，应该复用旧的节点，然后更新 props -> 打上 UPDATE 标签
        newFiber = new Fiber({
          ...transformVdomToFiber(child, oldFiber!.dom),
          tag: Tag.UPDATE,
          // * 这里是关键，指针指向 旧的节点
          alternate: oldFiber!,
          parent: fiber,
        })
      } else {
        // * 1， 3 如果标签类型不同，则代表是更新，应该删除旧的节点，然后添加新的节点
        // * 创建新的 fiber 节点
        newFiber = new Fiber({
          ...transformVdomToFiber(child, null),
          parent: fiber,
        })
        deletions.push(oldFiber!)
      }

      if (oldFiber) {
        // * alternate 指向下一个兄弟节点
        oldFiber = oldFiber.sibling
      }

      // * 第一个节点，那么，父节点的 child 应该指向她
      // * 否则， 则前序节点的 sibling 指向当前节点
      if (index === 0) {
        fiber.child = newFiber
      } else {
        prevChild!.sibling = newFiber
      }
      if (newFiber) {
        prevChild = newFiber
      }
    }
  })

  // * 2. 删除多余的 旧节点
  while (oldFiber) {
    deletions.push(oldFiber)
    oldFiber = oldFiber.sibling
  }
}

const commitRoot = (fiber: Fiber) => {
  // * 统一删除
  deletions.filter(Boolean).forEach(commitDeletion)
  commitWork(fiber.child)
  commitEffectHook()
  // * 提交完成后， 设置为 null
  currentRoot = wipRoot
  wipRoot = null
  deletions = []
}

const commitDeletion = (fiber: Fiber | null) => {
  if (fiber) {
    if (fiber.dom) {
      console.log('delete', fiber)
      let parent = fiber.parent
      while (parent && !parent.dom) {
        parent = parent.parent
      }
      parent?.dom?.removeChild(fiber.dom)
    } else {
      commitDeletion(fiber.child)
    }
  }

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

const commitEffectHook = () => {
  const run = (fiber: Fiber | null) => {
    if (!fiber) {
      return
    }
    if (!fiber.alternate) {
      fiber.effectHooks.forEach((effectHook) => {
        effectHook.callback()
      })
    } else {
      if (fiber.effectHooks.length === 0) {
        return
      }
      fiber.effectHooks.forEach((effectHook, index) => {
        const { deps } = effectHook
        const oldDeps = fiber.alternate!.effectHooks[index].deps
        const isChanged = deps.some((dep, i) => dep !== oldDeps[i])
        if (isChanged) {
          effectHook.callback()
        }
      })
    }
    run(fiber.child)
    run(fiber.sibling)
  }

  run(wipRoot)
}

const updateFunctionComponent = (fiber: Fiber) => {
  // * 将当前的 fiber 赋值给 wipFiber， 以便在 update 函数中，可以通过 wipFiber 拿到当前的 fiber
  wipFiber = fiber
  // * 清除 hook 树组，来到下一个 FC 的 HOOK 了
  stateHooks = []
  effectHooks = []
  stateHooksIndex = 0
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

export const update = () => {

  // * 这里采用闭包的方式，保存当前的 wipFiber
  // * 因为在每一次的 workLoop 中，如果是 FC 的话， wipFiber 会被重新赋值 -> 最小的更新单元是一个 fiber -> 对应到我们写的代码就是一个 FC
  // * 所以，这里需要利用闭包 保存当前的 wipFiber
  // * 当调用这个方法的时候，我们才知道 更新的起点，直接从这个起点开始，构建新的 fiber 链表
  const currentFiber = wipFiber
  return () => {
    wipRoot = new Fiber({
      ...currentFiber!,
      dom: currentFiber!.dom,
      props: currentFiber!.props,
      alternate: currentFiber,
    })
    nextWorkOfUnit = wipRoot
  }
}

let stateHooks: StateHook[] = []
let stateHooksIndex = 0
export const useState = <T>(initial: T) => {
  const currentFiber = wipFiber!
  // * 找到 之前旧 fiber 的 hook state
  const oldHook = currentFiber?.alternate?.stateHooks[stateHooksIndex] as StateHook<T>
  const stateHook: StateHook<T> = {
    state: oldHook ? oldHook.state : initial,
    queue: oldHook ? oldHook.queue : [],
  }

  // * 批量更新 state
  stateHook.queue.forEach((action) => {
    stateHook.state = action(stateHook.state)
  })
  stateHook.queue = []

  stateHooksIndex++
  stateHooks.push(stateHook)

  // * 更新为最新的 hook state
  currentFiber.stateHooks = stateHooks

  function setState(action: UpdateAction<T> | T) {

    // * 如果没有传入的 action 执行后， state 没有发生改变，那么就不需要更新了，直接 return
    const eagerState = typeof action === 'function' ? (action as UpdateAction<T>)(stateHook.state) : action
    if (eagerState === stateHook.state) {
      return
    }

    // * 先将 action 推入 queue 中，等待下一次更新时调用
    stateHook.queue.push((typeof action === 'function' ? action : () => action) as UpdateAction<T>)
    wipRoot = new Fiber({
      ...currentFiber!,
      dom: currentFiber!.dom,
      props: currentFiber!.props,
      alternate: currentFiber,
    })

    nextWorkOfUnit = wipRoot
  }

  return [stateHook.state, setState] as const
}

let effectHooks: EffectHook[] = []
export const useEffect = (callback: EffectAction, deps: any[]) => {
  const effectHook: EffectHook = {
    callback,
    deps,
  }
  effectHooks.push(effectHook)
  wipFiber!.effectHooks = effectHooks
}



const React = {
  createElement,
  createText,
  render,
  update,
  useState,
  useEffect
}

export default React
