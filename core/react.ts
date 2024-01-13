export type ElementType = string
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
      typeof child === 'string' ? createText(child) : child
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
  const { type, props } = el
  // * 创建 dom
  const dom: HTMLElement | Text =
    type === TEXT_ELEMENT
      ? document.createTextNode(props.nodeValue as string)
      : document.createElement(type as string)

  // * 添加 props 属性
  Object.keys(props).forEach((k) => {
    if (k !== 'children') {
      ;(dom as any)[k] = props[k]
    }
  })

  // * 递归处理 children
  props.children.forEach((child: ChildType) => {
    // 是 字符串，则不需要递归处理了
    if (typeof child === 'object') {
      render(child, dom as HTMLElement)
    }
  })

  container.appendChild(dom)
}

const React = {
  createElement,
  createText,
  render,
}

export default React
