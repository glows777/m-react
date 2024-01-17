import React from '../core/react'

const Counter = ({ num, title }: { num: number, title?: string }) => {
  return <div>counter{num}{title}</div>
}

const Counter2 = () => <div><Counter num={20} /></div>
const App = () => (
  <div id="hello">
    hello m-react
    <Counter num={10} title='hello world' />
    <Counter2 />
  </div>
)

export default App
