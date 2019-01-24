import React, { Component } from 'react'
import { HashRouter as Router, Route, Link } from 'react-router-dom'
import Secret from './secret'
import Axios from 'axios'
import * as Components from './components'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@material-ui/core'
import { connect } from 'react-redux'
import { AuthState } from './constants'
import { setAuth } from './redux/actions'
import { Dispatch } from 'redux'

declare global {
  // tslint:disable-next-line:interface-name
  interface Window {
    require: any
  }
}

const { BrowserWindow, app } = window.require('electron').remote

// tslint:disable-next-line:no-empty-interface
interface IMainBaseProps {}
interface IMainStateProps {
  authInfo: AuthState
}
interface IMainDispatchProps {
  setAuthInfo: (
    username: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) => void
}

interface IState {
  shouldLogin: boolean
  showBackBtn: boolean
  updateOpen: boolean
}

class MainPage extends Component<any, IState> {
  constructor(props: any) {
    super(props)
    this.state = { shouldLogin: true, showBackBtn: false, updateOpen: false }
    this.tryLogin = this.tryLogin.bind(this)
    this.handleUpdateDialogClose = this.handleUpdateDialogClose.bind(this)
    this.goAndGetUpdate = this.goAndGetUpdate.bind(this)
  }

  public async componentDidMount() {
    const username = localStorage.getItem('Username')

    this.setState({
      shouldLogin: username === null,
    })

    await this.checkUpdate()
    if (username != null) {
      const expiresIn = parseInt(
        window.localStorage.getItem('Expire-Date')!,
        10
      )
      const newToken = await this.refreshToken(username)
      setInterval(async () => {
        await this.refreshToken(username)
      }, expiresIn * 1000)
    }
  }

  private async refreshToken(username: string): Promise<string> {
    console.log({
      refresh_token: window.localStorage.getItem('Refresh-Token'),
      client_id: Secret.api.clientId,
      client_secret: Secret.api.secret,
    })

    const params =
      `client_id=${Secret.api.clientId}` +
      `&client_secret=${Secret.api.secret}` +
      `&refresh_token=${window.localStorage.getItem('Refresh-Token')}` +
      `&grant_type=refresh_token`

    const token = await Axios.post<{
      access_token: string
      refresh_token: string
      scope: string
      expires_in: number
    }>('https://id.twitch.tv/oauth2/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    window.localStorage.setItem('OAuth-Token', token.data.access_token)
    window.localStorage.setItem('Refresh-Token', token.data.refresh_token)

    this.updateAuthInfo(
      username,
      token.data.access_token,
      token.data.refresh_token,
      token.data.expires_in
    )

    return token.data.access_token
  }

  private updateAuthInfo(
    username: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) {
    this.props.setAuthInfo(username, accessToken, refreshToken, expiresIn)
  }

  private async checkUpdate() {
    const appVersion = app.getVersion()
    const newestVersion = await Axios.get(
      'https://api.github.com/repos/thy2134/ElecTwitch/releases'
    )
    if (
      newestVersion.data[0].tag_name.split('-')[0].substring(1) > appVersion
    ) {
      this.setState({
        updateOpen: true,
      })
    }
  }

  public componentDidUpdate(prevProps: any) {
    if (this.props.location !== prevProps.location) {
      this.setState({
        showBackBtn: this.props.location !== '/',
      })
    }
  }

  private toMainMenu(e: MouseEvent) {
    e.preventDefault()
  }
  private handleUpdateDialogClose() {
    this.setState({
      updateOpen: false,
    })
  }

  private async goAndGetUpdate() {
    const shell = window.require('electron').shell
    let url = await Axios.get(
      'https://api.github.com/repos/thy2134/ElecTwitch/releases'
    )
    url = url.data[0].html_url
    shell.openExternal(url)
    this.handleUpdateDialogClose()
  }

  private async tryLogin() {
    // Build the OAuth consent page URL
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
    })
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
      <Router>
        <div>
          <AppBar position="static">
            <Toolbar>
              <span id="title-span">Twitch</span>

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
          <div>
            <Route exact path="/" component={Components.StartPanel} />
            <Route path="/:streamerName" component={Components.Player} />
          </div>

          <Dialog
            open={this.state.updateOpen}
            onClose={this.handleUpdateDialogClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="update-dialog-title">
              {'Cool Update for the Cool Guys'}
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="update-dialog-description">
                {
                  "All the finest Twitch users get their update asap. Why don't you go and get some too?"
                }
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleUpdateDialogClose} color="primary">
                Close
              </Button>
              <Button onClick={this.goAndGetUpdate} color="primary" autoFocus>
                Take me to the Download Page
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      </Router>
    )
  }
}
const mapStateToProps = (
  state: { authReducer: AuthState },
  ownProps: IMainBaseProps
): IMainStateProps => {
  return {
    authInfo: state.authReducer,
    ...ownProps,
  }
}

const mapDispatchToProps = (dispatch: Dispatch<any>): IMainDispatchProps => {
  return {
    setAuthInfo: (
      username: string,
      accessToken: string,
      refreshToken: string,
      expiresIn: number
    ) => dispatch(setAuth({ username, accessToken, refreshToken, expiresIn })),
  }
}

export default connect<
  IMainStateProps,
  IMainDispatchProps,
  IMainBaseProps,
  { authReducer: AuthState }
>(
  mapStateToProps,
  mapDispatchToProps
)(MainPage)
