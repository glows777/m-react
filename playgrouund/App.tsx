import React from '../core/react'

let countFoo = 1
function Test() {
  return <div>hello</div>
}
function Foo() {
  console.log("foo rerun")
  const update = React.update()
  function handleClick() {
    countFoo++
    update()
  }

  return (
    <div>
      <h1>foo</h1>
      {countFoo}
      <Test />
      <button onClick={handleClick}>click</button>
    </div>
  );
}

let countBar = 1
function Bar() {
  console.log("bar rerun")
  const update = React.update()
  function handleClick() {
    countBar++
    update()
  }

  return (
    <div>
      <h1>bar</h1>
      {countBar}
      <button onClick={handleClick}>click</button>
    </div>
  );
}

let countRoot = 1;
function App() {
  console.log("app rerun")

  const update = React.update()
  function handleClick() {
    countRoot++
    update()
  }

  return (
    <div>
      hi-mini-react count: {countRoot}
      <button onClick={handleClick}>click</button>
      <Foo></Foo>
      <Bar></Bar>
    </div>
  )
}

export default App;
