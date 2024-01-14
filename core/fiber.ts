import { PropsType, VDOMElement, ElementType } from './react'
export class Fiber {
  // * dom 节点类型
  type: ElementType = ''
  // * 父节点
  parent: Fiber | null = null
  // * 下一个兄弟节点
  sibling: Fiber | null = null
  // * 第一个孩子节点
  child: Fiber | null = null
  // * dom
  dom: HTMLElement | Text | null = null
  props: PropsType
  constructor({ type, parent, sibling, child, dom, props }: Fiber) {
    this.type = type
    this.child = child
    this.sibling = sibling
    this.parent = parent
    this.dom = dom
    this.props = props
  }
}

export const transformFiberToVDom = (fiber: Fiber): VDOMElement => {
  return {
    type: fiber.type,
    props: {
      children: fiber.props.children
    },
  }
}

export const transformVdomToFiber = (
  vdom: VDOMElement,
  dom: HTMLElement | Text | null
): Fiber => {
  return new Fiber({
    type: vdom.type,
    // todo not sure that would this will trigger some error
    // todo waiting to test
    child: null,
    dom: dom,
    sibling: null,
    parent: null,
    props: vdom.props,
  })
}
