import { render } from './react.js'

const ReactDOM = {
  createRoot: (container) => ({
    render: (el) => render(el, container)
  })
}

export default ReactDOM
