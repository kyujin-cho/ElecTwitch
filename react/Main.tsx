import React, { Component } from 'react'
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom'

import * as Components from './components'

class MainPage extends Component {
  public render() {
    return (
      <div>
        <Router>
          <Route exact path="/" component={Components.StartPanel} />
          <Route path="/:streamerName" component={Components.Player} />
        </Router>
        <Components.Chat />
      </div>
    )
  }
}

export default MainPage
