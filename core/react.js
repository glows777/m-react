// dom -> vdom -> object
export const createElement = (type, props, ...children) => ({
  type: type,
  props: {
    ...props,
    children: children.map((child) =>
      typeof child === 'string' ? createText(child) : child
    ),
  },
})

const TEXT_ELEMENT = 'TEXT_ELEMENT'
export const createText = (text) => ({
  type: TEXT_ELEMENT,
  props: {
    nodeValue: text,
    children: [],
  },
})

export const render = (el, container) => {
  const { type, props } = el
  const dom =
    type === TEXT_ELEMENT
      ? document.createTextNode(props.nodeValue)
      : document.createElement('div')

  Object.keys(props).forEach((k) => {
    if (k !== 'children') {
      dom[k] = props[k]
    }
  })
  props.children.forEach((child) => render(child, dom))

  container.appendChild(dom)
}
