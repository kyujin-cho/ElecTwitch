import React, { Component, MouseEvent } from 'react'
import Axios from 'axios'
import secret from '../secret'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import HLSSource from './HLSSource'
import {
  Card,
  CardContent,
  Typography,
  Tooltip,
  Button,
} from '@material-ui/core'
import { Player } from 'video-react'
import { Chat } from '.'
import { Home } from '@material-ui/icons'

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

interface IState {
  isLoaded: boolean
  streamOn: boolean
  error: string
  streamInfo: any
  sig: string
  accessToken: string
  title: string
  videoUrl: string
}

class PlayerPage extends Component<RouteComponentProps<any>, IState> {
  constructor(props: RouteComponentProps<any>) {
    super(props)
    this.state = {
      isLoaded: false,
      streamOn: false,
      error: '',
      streamInfo: {},
      sig: '',
      accessToken: '',
      title: '',
      videoUrl: '',
    }

    this.backToHome = this.backToHome.bind(this)
  }
  public async componentDidMount() {
    console.log(this.props)
    await this.openStream(this.props.match.params.streamerName)
  }

  public componentWillUnmount() {
    const vidElement = document.getElementsByTagName('video')[0]
    if (vidElement) {
      vidElement.pause()
      this.setState({
        videoUrl: '',
      })
      vidElement.setAttribute('src', '')
    }
  }

  private backToHome(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    this.props.history.push('/')
  }
  private async openStream(userInfo: string) {
    let res
    let url = `https://api.twitch.tv/api/channels/${userInfo}/access_token?`
    url += serialize({
      need_https: 'false',
      oauth_token: '',
      platform: 'web',
      player_backend: 'mediaplayer',
    })
    try {
      res = await Axios.get(url, {
        headers: { 'client-id': secret.api.clientId },
      })
    } catch (e) {
      this.setState({
        error: '그런 스트리머가 존재하지 않습니다.',
        streamOn: false,
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

    this.setState({
      isLoaded: true,
      title:
        'Watching ' +
        (this.state.streamInfo
          ? this.state.streamInfo.stream.channel.display_name
          : String(userInfo)),
      videoUrl: url,
    })
    const showInput = document.getElementById('show-input')
    if (showInput !== null) showInput.classList.remove('hidden')
  }

  public render() {
    let body = <div className="hidden">Not Loaded!</div>
    if (this.state.isLoaded) {
      let playerArea = (
        <img
          id="player-banner"
          src={this.state.streamInfo.stream.channel.video_banner}
        />
      )
      if (this.state.streamOn) {
        playerArea = ( // tslint:disable-next-line:jsx-no-string-ref
          <Player ref="player" autoPlay={this.state.streamOn}>
            <HLSSource isVideoChild src={this.state.videoUrl} />
          </Player>
        )
      }
      body = (
        <div id="player">
          <Tooltip title="Back to Home" placement="bottom">
            <Button id="open-stream" color="primary" onClick={this.backToHome}>
              <Home />
            </Button>
          </Tooltip>
          <div id="player-left-side">
            {playerArea}
            <hr />
            <Card id="streamer-info">
              <div>
                <CardContent
                  style={{
                    flex: '1 0 auto',
                  }}
                >
                  <Typography variant="headline">
                    {this.state.streamInfo.stream.channel.status}
                  </Typography>
                  <Typography variant="subheading" color="secondary">
                    {this.state.streamInfo.stream.channel.display_name +
                      ' playing ' +
                      this.state.streamInfo.stream.channel.game}
                    <div id="viewer_count" />
                  </Typography>
                </CardContent>
              </div>
            </Card>
            <a href={this.state.streamInfo.stream.channel.url}>
              <img
                className="profile-photo"
                src={this.state.streamInfo.stream.channel.logo}
                alt={this.state.streamInfo.stream.channel.display_name}
              />
            </a>
          </div>
          <Chat
            streamer={this.props.match.params.streamerName}
            history={this.props.history}
            location={this.props.location}
            match={this.props.match}
          />
        </div>
      )
    }
    return body
  }
}

export default withRouter(PlayerPage)
