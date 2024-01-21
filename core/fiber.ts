import { PropsType, VDOMElement, ElementType } from './react'

export enum Tag {
  // * 创建阶段
  PLACEMENT = 'PLACEMENT',
  // * 更新阶段
  UPDATE = 'UPDATE'
}
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
  alternate: Fiber | null = null
  tag: Tag = Tag.PLACEMENT
  constructor({ type, parent, sibling, child, dom, props, alternate, tag }: Fiber) {
    this.type = type
    this.child = child
    this.sibling = sibling
    this.parent = parent
    this.dom = dom
    this.props = props
    this.alternate = alternate
    this.tag = tag
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
    alternate: null,
    tag: Tag.PLACEMENT
  })
}
