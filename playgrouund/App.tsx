import React, { update } from '../core/react'

let count = 10
let data: Record<string, any> = {
  id: 'hello'
}
const Counter = ({ num, title }: { num: number, title?: string }) => {
  const handelClick = () => {
    count++
    data = {
      className: 'hello'
    }
    update()
  }
  return (
    <div {...data}>
      count: {count}
      <button onClick={handelClick}>click</button>
    </div >
  )
}

const Counter2 = () => <div>hello</div>
const App = () => (
  <div id="hello">
    hello m-react
    <Counter num={10} title='hello world' />
    <Counter2 />
  </div>
)

export default App
