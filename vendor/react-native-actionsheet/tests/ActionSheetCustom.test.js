import 'react-native'
import React from 'react'
import renderer from 'react-test-renderer'

import ExampleA from '../Examples/Basic/ExampleA'
import ExampleB from '../Examples/Basic/ExampleB'

test('ExampleA render correctly', () => {
  const tree = renderer.create(
    <ExampleA />
  ).toJSON()
  expect(tree).toMatchSnapshot()
})

test('ExampleB render correctly', () => {
  const tree = renderer.create(
    <ExampleB />
  ).toJSON()
  expect(tree).toMatchSnapshot()
})
