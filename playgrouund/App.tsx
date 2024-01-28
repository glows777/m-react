import React, { useState } from "../core/react"

function Foo() {
  console.log("re foo")
  const [count, setCount] = useState(10)
  const [bar, setBar] = useState("bar")
  function handleClick() {
    setCount((c) => c + 1)
    setBar(() => "bar")
  }

  return (
    <div>
      <h1>foo</h1>
      {count}
      <div>{bar}</div>
      <button onClick={handleClick}>click</button>
    </div>
  )
}

function App() {
  return (
    <div>
      hi-m-react
      <Foo />
    </div>
  )
}

export default App
