import * as React from 'react'
import ReactDOM from 'react-dom'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import { Reducers } from './redux/reducers'
import Main from './Main'

const store = createStore(Reducers)

ReactDOM.render(
  <Provider store={store}>
    <Main />
  </Provider>,
  document.getElementById('container')
)
