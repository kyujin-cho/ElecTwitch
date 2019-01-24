import React, { Component } from 'react'
import { HashRouter as Router, Switch, Route, Link } from 'react-router-dom'
import Secret from './secret'
import Axios from 'axios'
import * as Components from './components'
import { AppBar, Toolbar, Typography, Button } from '@material-ui/core'

declare global {
  // tslint:disable-next-line:interface-name
  interface Window {
    require: any
  }
}

const { BrowserWindow, app } = window.require('electron').remote

class MainPage extends Component<any, { shouldLogin: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { shouldLogin: true }
    this.tryLogin = this.tryLogin.bind(this)
  }

  public async componentDidMount() {
    this.setState({
      shouldLogin: window.localStorage.getItem('Username') === null,
    })
  }

  private async tryLogin() {
    // Build the OAuth consent page URL
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
    })
    authWindow.webContents.openDevTools()
    const twitchUrl = 'https://id.twitch.tv/oauth2/authorize?'
    const authUrl =
      twitchUrl +
      `client_id=${
        Secret.api.clientId
      }&redirect_uri=http://localhost&response_type=code&scope=chat_login`
    authWindow.loadURL(authUrl)
    authWindow.show()

    console.log(`Redirecting to ${authUrl}`)

    let handleCallback = async (url: string) => {
      const rawCode = /code=([^&]*)/.exec(url) || null
      const code = rawCode && rawCode.length > 1 ? rawCode[1] : null
      const error = /\?error=(.+)$/.exec(url)

      console.log('Code: ' + code)
      console.log('Raw Code: ' + rawCode)
      console.log('URL: ' + url)

      if (url.indexOf('http://localhost/?code') === -1) {
        authWindow.loadURL(url)
        return
      }

      if (code || error) {
        // Close the browser if code found or error
        authWindow.destroy()
      }

      // If there is a code, proceed to get token from github
      if (code) {
        const params =
          `client_id=${Secret.api.clientId}` +
          `&client_secret=${Secret.api.secret}` +
          `&code=${code}` +
          `&grant_type=authorization_code` +
          `&redirect_uri=http://localhost`
        const token = await Axios.post<{
          access_token: string
          refresh_token: string
          expires_in: number
          scope: string[]
          token_type: string
        }>('https://api.twitch.tv/kraken/oauth2/token?' + params, {})

        localStorage.setItem('OAuth-Token', token.data.access_token)
        localStorage.setItem('Refresh-Token', token.data.refresh_token)
        localStorage.setItem('Expire-Date', String(token.data.expires_in))

        const userInfo = await Axios.get('https://api.twitch.tv/helix/users', {
          headers: {
            'Client-ID': Secret.api.clientId,
            Authorization: 'Bearer ' + token.data.access_token,
          },
        })

        console.log(userInfo.data)

        localStorage.setItem('Username', userInfo.data.data[0].login)

        window.location.reload()
      } else if (error) {
        alert(
          "Oops! Something went wrong and we couldn't" +
            'log you in using Github. Please try again.'
        )
      }
    }
    handleCallback = handleCallback.bind(this)

    // Handle the response from GitHub - See Update from 4/12/2015

    authWindow.webContents.on(
      'will-navigate',
      (event: Electron.Event, url: string) => {
        console.log('Navigating to ' + url)
        handleCallback(url)
      }
    )
    authWindow.webContents.on(
      'will-redirect',
      (event: Electron.Event, url: string) => {
        console.log('Navigating to ' + url)
        handleCallback(url)
      }
    )
  }
  public render() {
    return (
      <div>
        <AppBar position="static">
          <Toolbar>
            <Typography id="title-area" color="inherit" style={{ flex: 1 }}>
              Twitch
            </Typography>

            <Button
              color="inherit"
              id="login-button"
              onClick={this.tryLogin}
              disabled={!this.state.shouldLogin}
            >
              {this.state.shouldLogin ? 'Login' : 'Logged In'}
            </Button>
          </Toolbar>
        </AppBar>
        <Router>
          <div>
            <Route exact path="/" component={Components.StartPanel} />
            <Route path="/:streamerName" component={Components.Player} />
          </div>
        </Router>
      </div>
    )
  }
}

export default MainPage
