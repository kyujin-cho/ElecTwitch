import React, { Component, ChangeEvent, Dispatch } from 'react'
import Axios from 'Axios'
import secret from '../../secret'
import { BrowserWindow } from 'electron'
import DialogActions from '@material-ui/core/DialogActions'
import {
  DialogContentText,
  DialogContent,
  Button,
  Dialog,
  AppBar,
  Toolbar,
  Typography,
  Tooltip,
  DialogTitle,
  TextField,
} from '@material-ui/core'
import FollowStreams from './FollowStreams'
import { ChatState, AuthState } from '../../constants'
import { setAuth, setStreamer } from '../../redux/actions'
import { connect } from 'react-redux'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import { Send, Add } from '@material-ui/icons'

type GameType = {
  user_id: string
  game_id: string
  game: string
  display_name: string
}
const serialize = (obj: any) => {
  const str = []
  for (const p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
    }
  }
  return str.join('&')
}

const clone = (obj: any) => {
  if (obj === null || typeof obj !== 'object') return obj
  const copy = obj.constructor()
  for (const attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      copy[attr] = obj[attr]
    }
  }
  return copy
}

// tslint:disable-next-line:no-empty-interface
interface IStartBaseProps extends RouteComponentProps<any> {}
interface IStartStateProps {
  chatInfo: ChatState
  authInfo: AuthState
}
// tslint:disable-next-line:no-empty-interface
interface IStartDispatchProps {
  setAuthInfo: (
    username: string,
    password: string,
    refreshToken: string
  ) => void
  setChatInfo: (streamer: string) => void
}

interface IState {
  streamerName: string
  isStreamOpening: boolean
  isChatFollowing: boolean
  follow_streams: any[]
  dcCon: any
  updateOpen: boolean
  users: any
  client: null
  chats: any[]
  title: string
  error: string
  isLoaded: boolean
  streamOn: boolean
  accessToken: any
  streamInfo: any
  sig: string
  dialogOpen: boolean
}

class StartPanelPage extends Component<
  IStartStateProps & IStartDispatchProps & IStartBaseProps,
  IState
> {
  constructor(props: IStartStateProps & IStartDispatchProps & IStartBaseProps) {
    super(props)
    this.state = {
      streamerName: '',
      isStreamOpening: false,
      isChatFollowing: false,
      follow_streams: [],
      dcCon: {},
      updateOpen: false,
      users: {},
      client: null,
      chats: [],
      title: 'ElecTwitch',
      error: '',
      isLoaded: false,
      streamOn: false,
      accessToken: {},
      streamInfo: {},
      sig: '',
      dialogOpen: false,
    }

    this.openStream = this.openStream.bind(this)
    this.tryLogin = this.tryLogin.bind(this)
    this.handleClickOpen = this.handleClickOpen.bind(this)
    this.handleClose = this.handleClose.bind(this)
    this.onChange = this.onChange.bind(this)
    this.handleUpdateDialogClose = this.handleUpdateDialogClose.bind(this)
    this.goAndGetUpdate = this.goAndGetUpdate.bind(this)
  }

  public async componentDidMount() {
    this.putChatInfo('#')
    const appVersion = window.require('electron').remote.app.getVersion()
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
    if (localStorage.getItem('Username') != null) await this.refreshToken()
  }

  private async refreshToken() {
    console.log({
      refresh_token: window.localStorage.getItem('Refresh-Token'),
      client_id: secret.api.clientId,
      client_secret: secret.api.secret,
    })

    const token = await Axios.post(
      'https://api.twitch.tv/kraken/oauth2/token',
      {
        refresh_token: window.localStorage.getItem('Refresh-Token'),
        client_id: secret.api.clientId,
        client_secret: secret.api.secret,
        grant_type: 'refresh_token',
      }
    )

    window.localStorage.setItem('OAuth-Token', token.data.access_token)
    window.localStorage.setItem('Refresh-Token', token.data.refresh_token)
    window.localStorage.setItem('Expire-Date', token.data.expires_in)

    await this.setUserData(
      token.data.access_token,
      token.data.refresh_token,
      token.data.expires_in
    )
  }

  private async tryLogin() {
    // Build the OAuth consent page URL
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
    })
    const twitchUrl = 'https://api.twitch.tv/kraken/oauth2/authorize?'
    const authUrl =
      twitchUrl +
      `client_id=${
        secret.api.clientId
      }&redirect_uri=http://localhost&response_type=code&scope=chat_login`
    authWindow.loadURL(authUrl)
    authWindow.show()

    let handleCallback = async (url: string) => {
      const rawCode = /code=([^&]*)/.exec(url) || null
      const code = rawCode && rawCode.length > 1 ? rawCode[1] : null
      const error = /\?error=(.+)$/.exec(url)

      console.log('Code: ' + code)
      console.log('Raw Code: ' + rawCode)
      console.log('URL: ' + url)

      if (url.indexOf('https://passport.twitch.tv/two_factor/') !== -1) {
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
          `client_id=${secret.api.clientId}` +
          `&client_secret=${secret.api.secret}` +
          `&code=${code}` +
          `&grant_type=authorization_code` +
          `&redirect_uri=http://localhost`
        const token = await Axios.post(
          'https://api.twitch.tv/kraken/oauth2/token?' + params,
          {}
        )

        localStorage.setItem('OAuth-Token', token.data.access_token)
        localStorage.setItem('Refresh-Token', token.data.refresh_token)
        localStorage.setItem('Expire-Date', token.data.expires_in)

        await this.setUserData(
          token.data.access_token,
          token.data.refresh_token,
          token.data.expires_in
        )
      } else if (error) {
        alert(
          "Oops! Something went wrong and we couldn't" +
            'log you in using Github. Please try again.'
        )
      }
    }
    handleCallback = handleCallback.bind(this)

    // Handle the response from GitHub - See Update from 4/12/2015

    authWindow.webContents.on('will-navigate', (event, url) => {
      handleCallback(url)
    })

    authWindow.webContents.on(
      'will-navigate',
      (event: Electron.Event, url: string) => {
        handleCallback(url)
      }
    )
  }

  private async setUserData(
    accessToken: string,
    refreshToken: string,
    expiresIn: string
  ) {
    const userData = await Axios.get('https://api.twitch.tv/kraken/user', {
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': secret.api.clientId,
        Authorization: 'OAuth ' + accessToken,
      },
    })

    localStorage.setItem('Username', userData.data.name)
    const loginBtn: any = document.getElementById('login-button')
    if (loginBtn !== null) {
      loginBtn.disabled = true
      loginBtn.innerText = 'Logged In'
    }

    const follows = await Axios.get(
      'https://api.twitch.tv/helix/users/follows?from_id=' + userData.data._id,
      {
        headers: {
          'Client-ID': secret.api.clientId,
        },
      }
    )

    let games = JSON.parse(window.localStorage.getItem('Games-JSON') || '')
    if (games === null) games = {}
    const gamesToRetrieve: Array<{ user_id: string; game_id: string }> = []
    let followStreams: GameType[] = []
    const streams = await Axios.get(
      'https://api.twitch.tv/helix/streams?user_id=' +
        follows.data.data.map((item: any) => item.to_id).join('&user_id='),
      {
        headers: {
          'Client-ID': 'jzkbprff40iqj646a697cyrvl0zt2m6',
        },
      }
    )

    followStreams = streams.data.data
    followStreams.map((item, index) => {
      if (!games[item.game_id]) {
        gamesToRetrieve.push({ user_id: item.user_id, game_id: item.game_id })
      }
    })

    if (gamesToRetrieve.length > 0) {
      const game = await Axios.get(
        'https://api.twitch.tv/helix/games?id=' +
          gamesToRetrieve.map(item => item.game_id).join('&id='),
        {
          headers: {
            'Client-ID': secret.api.clientId,
          },
        }
      )
      game.data.data.forEach((item: { id: string }) => {
        games[item.id] = item
      })
    }

    const users = await Axios.get(
      'https://api.twitch.tv/helix/users?id=' +
        followStreams.map(item => item.user_id).join('&id='),
      {
        headers: {
          'Client-ID': secret.api.clientId,
        },
      }
    )
    if (users.data.data) {
      users.data.data.forEach((item: any) => {
        let i = 0
        while (
          i < followStreams.length &&
          followStreams[i].user_id !== item.id
        ) {
          i++
        }
        if (i !== followStreams.length) return true
        else followStreams[i].game = item.name
        followStreams[i].display_name = item.display_name
      })
    }

    window.localStorage.setItem('Games-JSON', JSON.stringify(games))
    this.setState({
      follow_streams: followStreams,
    })

    await this.putChatInfo('#')
  }

  private async putChatInfo(channel: string) {
    if (localStorage.getItem('OAuth-Token') !== null) {
      this.props.setAuthInfo(
        localStorage.getItem('Username')!,
        'oauth:' + localStorage.getItem('OAuth-Token'),
        localStorage.getItem('Refresh-Token')!
      )
    } else {
      this.props.setAuthInfo(
        'justinfan' + Math.floor(Math.random() * 100000),
        '',
        ''
      )
    }
    this.props.setChatInfo(channel)
  }

  private onChange(e: ChangeEvent<HTMLInputElement>) {
    this.setState({
      streamerName: e.target.value,
    })
  }

  private handleKey(e: KeyboardEvent) {
    if (e.keyCode === 91) this.onClick()
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

  private onClick() {
    this.openStream(String(this.state.streamerName).toString(), true)
  }

  public async openStream(userInfo: any, isClicked: boolean) {
    if (this.state.isStreamOpening) return
    this.setState({
      isStreamOpening: true,
    })
    this.setState({
      error: '',
    })

    if (!isClicked) {
      const userdata = await Axios.get(
        'https://api.twitch.tv/helix/users?id=' + userInfo,
        {
          headers: {
            'Client-ID': secret.api.clientId,
          },
        }
      )
      if (userdata.data) {
        userInfo = userdata.data.data[0].login
      } else {
        this.setState({
          error: '그런 스트리머가 존재하지 않습니다.',
          streamOn: false,
        })
        return
      }
    }

    const prevUser = this.state.streamInfo.stream
      ? this.state.streamInfo.stream.channel.name
      : ''
    let res
    let url = `https://api.twitch.tv/api/channels/${userInfo}/access_token?`
    url += serialize({
      adblock: 'false',
      need_https: 'false',
      oauth_token: '',
      platform: 'web',
      player_type: 'site',
    })
    try {
      res = await Axios.get(url, {
        headers: { 'client-id': secret.api.clientId },
      })
    } catch (e) {
      this.setState({
        error: '그런 스트리머가 존재하지 않습니다.',
        streamOn: false,
        isStreamOpening: false,
      })
      return
    }
    this.setState({
      sig: res.data.sig,
      accessToken: res.data.token,
    })
    const streamInfo = JSON.parse(res.data.token)

    url = `https://usher.ttvnw.net/api/channel/hls/${userInfo}.m3u8?`
    url += serialize({
      allow_source: 'true',
      baking_bread: 'false',
      fast_bread: 'false',
      player_backend: 'mediaplayer',
      rtqos: 'control',
      sig: this.state.sig,
      token: this.state.accessToken,
    })
    const isStreaming = await Axios.get(
      `https://api.twitch.tv/kraken/streams/${streamInfo.channel_id}`,
      {
        headers: {
          Accept: 'application/vnd.twitchtv.v5+json',
          'Client-ID': secret.api.clientId,
        },
      }
    )

    if (!isStreaming.data.stream) {
      const channelInfo = await Axios.get(
        `https://api.twitch.tv/kraken/channels/${streamInfo.channel_id}`,
        {
          headers: {
            Accept: 'application/vnd.twitchtv.v5+json',
            'Client-ID': secret.api.clientId,
          },
        }
      )

      this.setState({
        streamInfo: { stream: { channel: channelInfo.data } },
        streamOn: false,
      })
      const titleArea: any = document.getElementById('title-area')
      if (titleArea != null) {
        titleArea.classList.remove('streamer-on')
        titleArea.classList.add('streamer-off')
      }
    } else {
      const badges = await Axios.get(
        'https://api.twitch.tv/kraken/chat/' +
          isStreaming.data.stream.channel._id +
          '/badges',
        {
          headers: {
            'Client-ID': secret.api.clientId,
            Accept: 'application/vnd.twitchtv.v5+json',
          },
        }
      )
      isStreaming.data.badges = badges.data
      this.setState({
        streamInfo: isStreaming.data,
        streamOn: true,
      })
      const titleArea: any = document.getElementById('title-area')
      if (titleArea != null) {
        titleArea.classList.remove('streamer-off')
        titleArea.classList.add('streamer-on')
      }
    }
    document
      .getElementsByClassName('following-streams')[0]
      .classList.add('hidden')

    await this.putChatInfo(userInfo)

    this.setState({
      isLoaded: false,
      chats: [],
    })
    this.setState({
      isLoaded: true,
      title:
        'Watching ' +
        (this.state.streamInfo
          ? this.state.streamInfo.stream.channel.display_name
          : String(userInfo)),
    })
    const showInput = document.getElementById('show-input')
    if (showInput !== null) showInput.classList.remove('hidden')
    this.handleClose()
    this.setState({
      isStreamOpening: false,
    })
  }

  private handleClose() {
    this.setState({
      dialogOpen: false,
    })
  }

  private handleClickOpen() {
    this.setState({
      dialogOpen: true,
      error: '',
    })
  }

  public render() {
    return (
      <div>
        <AppBar position="static">
          <Toolbar>
            {/* <IconButton className={classes.menuButton} color="contrast" aria-label="Menu">
                      <MenuIcon />
                  </IconButton> */}
            <Typography id="title-area" color="inherit" style={{ flex: 1 }}>
              {this.state.title}
            </Typography>

            <Button color="inherit" id="login-button" onClick={this.tryLogin}>
              Login
            </Button>
          </Toolbar>
        </AppBar>
        <div id="main">
          <Tooltip title="Open Stream" placement="bottom">
            <Button
              id="open-stream"
              color="primary"
              onClick={this.handleClickOpen}
            >
              <Add />
            </Button>
          </Tooltip>
          <Dialog
            open={this.state.dialogOpen}
            onClose={this.handleClose}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title">Open Stream</DialogTitle>
            <DialogContent>
              <DialogContentText>
                <span className="error">{this.state.error}</span>
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="streamer"
                label="Streamer Name"
                type="text"
                onChange={this.onChange}
                fullWidth
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleClose} color="primary">
                Cancel
              </Button>
              <Button onClick={this.onClick} color="primary">
                Go <Send className="icon-right" />
              </Button>
            </DialogActions>
          </Dialog>
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
          <div
            id="show-input"
            onClick={() =>
              document
                .getElementById('streamer-input')!
                .classList.remove('hidden')
            }
            className="hidden"
          />
          <FollowStreams
            streams={this.state.follow_streams}
            openStream={this.openStream}
          />
        </div>
      </div>
    )
  }
}

const mapStateToProps = (
  state: ChatState & AuthState,
  ownProps: IStartBaseProps
): IStartStateProps => {
  return {
    authInfo: {
      username: state.username,
      password: state.password,
      refreshToken: state.refreshToken,
    },
    chatInfo: {
      streamer: state.streamer,
      streamerName: state.streamerName,
    },
    ...ownProps,
  }
}

const mapDispatchToProps = (dispatch: Dispatch<any>): IStartDispatchProps => {
  return {
    setAuthInfo: (username: string, password: string, refreshToken: string) =>
      dispatch(setAuth({ username, password, refreshToken })),
    setChatInfo: (streamer: string) => dispatch(setStreamer(streamer)),
  }
}

export default connect<
  IStartStateProps,
  IStartDispatchProps,
  IStartBaseProps,
  ChatState & AuthState
>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(StartPanelPage))
