import React from '../core/react'

const Counter = ({ num, children }: { num: number, children?: any }) => {
  return <div>counter{num}</div>
}

const Counter2 = () => <><Counter num={20} /></>
const App = () => (
  <div id="hello">
    hello m-react
    <Counter num={10} />
    <Counter2 />
  </div>
)

export default App
