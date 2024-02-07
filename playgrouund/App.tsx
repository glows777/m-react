/* eslint-disable no-console */
import React, { useMemo, useState } from '../core/react'

function Foo() {
  console.log('re foo')
  const [count, setCount] = useState(10)
  const [bar, setBar] = useState('bar')

  // * 1. 传入一个函数， 执行该函数，只有当deps 改变的时候，采取重新执行 callback， 计算新的值
  const countPlusOne = useMemo(() => count + 1, [count])
  const doubleBar = useMemo(() => ({ foo: bar + bar }), [bar])
  function handleClick() {
    setCount(c => c + 1)
    setBar(prev => `${prev}bar`)
  }
  console.log(countPlusOne)
  console.log(doubleBar)

  // useEffect(() => {
  //   console.log('effect foo')
  //   console.log(count)
  //   return () => {
  //     console.log('unmount foo')
  //   }
  // }, [count])

  // useEffect(() => {
  //   console.log('effect bar')
  //   console.log(bar)

  //   return () => {
  //     console.log('unmount bar')
  //   }
  // }, [bar])

  // useEffect(() => {
  //   console.log('init')
  //   return () => {
  //     console.log('unmount')
  //   }
  // }, [])
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
  // const [count, setCount] = useState(0)
  // useEffect(() => {
  //   console.log(count)
  // }, [count])
  return (
    <div>
      {/* {count} */}
      {/* <button onClick={() => setCount(prev => prev + 1)}>click me</button> */}
      hi-m-react
      <Foo />
    </div>
  )
}

export default App
