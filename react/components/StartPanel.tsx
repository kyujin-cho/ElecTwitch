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
import { setAuth } from '../redux/actions'
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
  authInfo: AuthState
}
// tslint:disable-next-line:no-empty-interface
interface IStartDispatchProps {}

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
    this.onClick = this.onClick.bind(this)
  }

  private openStream(stream: string) {
    this.props.history.push('/' + stream)
  }

  public async componentDidMount() {
    const accessToken = this.props.authInfo.accessToken
    const username = localStorage.getItem('Username')

    if (username !== null) {
      await this.setUserData(accessToken)
    }
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

  private onChange(e: ChangeEvent<HTMLInputElement>) {
    this.setState({
      streamerName: e.target.value,
    })
  }

  // private handleKey(e: KeyboardEvent) {
  //   if (e.keyCode === 91) this.onClick()
  // }

  private onClick() {
    this.props.history.push('/' + this.state.streamerName)
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
  state: { authReducer: AuthState },
  ownProps: IStartBaseProps
): IStartStateProps => {
  return {
    authInfo: state.authReducer,
    ...ownProps,
  }
}
export default connect<
  IStartStateProps,
  IStartDispatchProps,
  IStartBaseProps,
  { authReducer: AuthState }
>(mapStateToProps)(withRouter(StartPanelPage))
