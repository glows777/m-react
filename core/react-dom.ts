import type { VDOMElement } from './react'
import { render } from './react'

type ContainerType = HTMLElement

interface Root {
  render: (el: VDOMElement) => void
}

const ReactDOM = {
  createRoot: (container: ContainerType): Root => ({
    render: el => render(el, container),
  }),
}

export default ReactDOM
