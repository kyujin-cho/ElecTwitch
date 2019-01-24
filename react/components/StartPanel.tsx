import React, { Component, ChangeEvent, Dispatch } from 'react'
import Axios from 'Axios'
import secret from '../secret'
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
import { ChatState, AuthState, MyStreamsType } from '../constants'
import { setAuth, setStreamer } from '../redux/actions'
import { connect } from 'react-redux'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import { Send, Add } from '@material-ui/icons'

type TwitchStreamsType = {
  user_id: string
  game_id: string
  game: string
  user_name: string
  thumbnail_url: string
  title: string
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
    accessToken: string,
    refreshToken: string,
    expiresIn: number
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
  chats: Array<MyStreamsType & { user_id: string }>
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
    this.handleClickOpen = this.handleClickOpen.bind(this)
    this.handleClose = this.handleClose.bind(this)
    this.onChange = this.onChange.bind(this)
    this.handleUpdateDialogClose = this.handleUpdateDialogClose.bind(this)
    this.goAndGetUpdate = this.goAndGetUpdate.bind(this)
  }

  private openStream(stream: string) {
    this.props.history.push('/' + stream)
  }

  public async componentDidMount() {
    this.updateChatInfo('#')
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

    const username = localStorage.getItem('Username')
    if (username != null) {
      const expiresIn = parseInt(
        window.localStorage.getItem('Expire-Date')!,
        10
      )
      const newToken = await this.refreshToken(username)
      await this.setUserData(newToken)
      setInterval(async () => {
        await this.refreshToken(username)
      }, expiresIn * 1000)
    } else this.logout()
  }

  private async refreshToken(username: string): Promise<string> {
    console.log({
      refresh_token: window.localStorage.getItem('Refresh-Token'),
      client_id: secret.api.clientId,
      client_secret: secret.api.secret,
    })

    const params =
      `client_id=${secret.api.clientId}` +
      `&client_secret=${secret.api.secret}` +
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

    await this.updateAuthInfo(
      username,
      token.data.access_token,
      token.data.refresh_token,
      token.data.expires_in
    )

    return token.data.access_token
  }

  private async setUserData(accessToken: string) {
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

    let games: any = {}
    if (window.localStorage.getItem('Games-JSON') !== null) {
      games = JSON.parse(window.localStorage.getItem('Games-JSON')!)
    }
    const gamesToRetrieve: Array<{ user_id: string; game_id: string }> = []
    const streams = await Axios.get<{
      data: TwitchStreamsType[]
    }>(
      'https://api.twitch.tv/helix/streams?user_id=' +
        follows.data.data.map((item: any) => item.to_id).join('&user_id='),
      {
        headers: {
          'Client-ID': 'jzkbprff40iqj646a697cyrvl0zt2m6',
        },
      }
    )

    const followStreamsFromAPI: TwitchStreamsType[] = streams.data.data
    const followStreams: { [id: string]: MyStreamsType } = {}
    followStreamsFromAPI.map((item, index) => {
      followStreams[item.user_id] = {
        login: '',
        game_id: item.game_id,
        game: '',
        display_name: item.user_name,
        thumbnail_url: item.thumbnail_url,
        title: item.title,
      }
      if (!games[item.game_id]) {
        gamesToRetrieve.push({ user_id: item.user_id, game_id: item.game_id })
      }
    })

    if (gamesToRetrieve.length > 0) {
      const newGames = await Axios.get(
        'https://api.twitch.tv/helix/games?id=' +
          gamesToRetrieve.map(item => item.game_id).join('&id='),
        {
          headers: {
            'Client-ID': secret.api.clientId,
          },
        }
      )
      newGames.data.data.forEach((item: { id: string }) => {
        games[item.id] = item
      })
    }

    const users = await Axios.get(
      'https://api.twitch.tv/helix/users?id=' +
        followStreamsFromAPI.map(item => item.user_id).join('&id='),
      {
        headers: {
          'Client-ID': secret.api.clientId,
        },
      }
    )
    if (users.data.data) {
      users.data.data.forEach((item: any) => {
        followStreams[item.id].login = item.login
        followStreams[item.id].game = games[followStreams[item.id].game_id]
      })
    }

    window.localStorage.setItem('Games-JSON', JSON.stringify(games))
    this.setState({
      follow_streams: Object.keys(followStreams).map((item: string) => ({
        ...followStreams[item],
        user_id: item,
      })),
    })
  }

  private async updateAuthInfo(
    username: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) {
    this.props.setAuthInfo(username, accessToken, refreshToken, expiresIn)
  }

  private logout() {
    this.props.setAuthInfo(
      'justinfan' + Math.floor(Math.random() * 100000),
      '',
      '',
      0
    )
  }

  private updateChatInfo(streamer: string) {
    this.props.setChatInfo(streamer)
  }

  private onChange(e: ChangeEvent<HTMLInputElement>) {
    this.setState({
      streamerName: e.target.value,
    })
  }

  // private handleKey(e: KeyboardEvent) {
  //   if (e.keyCode === 91) this.onClick()
  // }

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
    this.openStream(String(this.state.streamerName).toString())
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
        <FollowStreams streams={this.state.follow_streams} />
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
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      expiresIn: state.expiresIn,
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
    setAuthInfo: (
      username: string,
      accessToken: string,
      refreshToken: string,
      expiresIn: number
    ) => dispatch(setAuth({ username, accessToken, refreshToken, expiresIn })),
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
