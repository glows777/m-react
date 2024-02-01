import React, { useState, useEffect } from "../core/react"

function Foo() {
  console.log("re foo")
  const [count, setCount] = useState(10)
  const [bar, setBar] = useState("bar")
  function handleClick() {
    setCount((c) => c + 1)
    setBar(prev => prev + "bar")
  }

  useEffect(() => {
    console.log("effect foo")
    console.log(count)
  }, [count])

  useEffect(() => {
    console.log("effect bar")
    console.log(bar)
  }, [bar])

  useEffect(() => {
    console.log('init')
  }, [])
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
  const [count, setCount] = useState(0)
  useEffect(() => {
    console.log(count)
  }, [count])
  return (
    <div>
      {count}<button onClick={() => setCount(prev => prev + 1)}>click me</button>
      hi-m-react
      <Foo />
    </div>
  )
}

export default App
