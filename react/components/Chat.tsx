import Mui, { Card, CardContent, TextField, Button } from '@material-ui/core'
import Axios, { AxiosResponse } from 'axios'
import linkifyUrls from 'linkify-urls'
import React, { ChangeEvent, Component, KeyboardEvent } from 'react'
import { connect } from 'react-redux'
import tmi, { Client } from 'twitch-js'
import { AuthState, ChatState, YDCConResponse } from '../constants'
import secret from '../secret'
import { withRouter, RouteComponentProps } from 'react-router-dom'

declare global {
  // tslint:disable-next-line:interface-name
  interface Window {
    require: any
  }
}

const { ipcRenderer } = window.require('electron')

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

interface IChatStateProps {
  authInfo: AuthState
}
// tslint:disable-next-line:no-empty-interface
interface IChatDispatchProps {}

interface IChatBaseProps extends RouteComponentProps<any> {
  streamer: string
}

interface IState {
  dcCon: any
  badges: any
  specialModeActivated: boolean
  irc: Client
  chat: string
  sendingChat: boolean
  keymap: any
  users: any
  index: number
  theme: string
  streamer: string
}

interface IChatType {
  username: string
  message: string
  color?: string | null
  'display-name'?: string | null
  'emotes-raw'?: string | null
  'badges-raw'?: string | null
}

class ChatPage extends Component<
  IChatStateProps & IChatDispatchProps & IChatBaseProps,
  IState
> {
  constructor(props: IChatStateProps & IChatDispatchProps & IChatBaseProps) {
    super(props)
    this.state = {
      dcCon: {},
      badges: {},
      specialModeActivated: false,
      irc: new tmi.client(),
      chat: '',
      sendingChat: false,
      keymap: {},
      users: {},
      index: -1,
      theme: '../stylesheets/bridgebbcc_default.css',
      streamer: props.streamer,
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleKey = this.handleKey.bind(this)
    this.sendChat = this.sendChat.bind(this)
  }

  public async componentDidMount() {
    // this.props.router.setRouteLeaveHook(this.props.route, () => {})
    await this.activateChat()
  }

  public async componentWillUnmount() {
    await this.state.irc.disconnect()
    console.log('Disconnected from IRC')
  }

  private async activateChat() {
    this.state.irc.opts = {
      options: {
        debug: true,
        clientId: secret.api.clientId,
      },
      connection: {
        reconnect: false,
      },
      identity: {
        username: this.props.authInfo.username,
        password: 'oauth:' + this.props.authInfo.accessToken,
      },
    }
    console.log(this.props)
    if (!window.localStorage.getItem('Chat-Color')) {
      window.localStorage.setItem('Chat-Color', 'none')
    }
    let cssURL = window.localStorage.getItem('cssURL')
    if (!cssURL) {
      cssURL = '../stylesheets/chat.css'
      window.localStorage.setItem('cssURL', cssURL)
    }

    const stylesheet = document.createElement('link')
    stylesheet.id = 'chat-theme'
    stylesheet.setAttribute('rel', 'stylesheet')
    stylesheet.setAttribute('href', cssURL)
    document.head.appendChild(stylesheet)

    const irc = this.state.irc

    console.log('Connecting to ')
    irc
      .connect()
      .then(() => {
        if (this.state.streamer !== '#') irc.join(this.state.streamer)
      })
      .catch(err => console.error(err))
    irc.on(
      'notice',
      function(
        this: ChatPage,
        channel: string,
        msgid: string,
        message: string
      ) {
        this.addChat({ username: 'Twitch System', message })
      }.bind(this)
    )
    irc.on(
      'message',
      function(
        this: ChatPage,
        channel: string,
        userstate: any,
        message: any,
        self: any
      ) {
        ipcRenderer.send('chat')
        userstate.message = message
        if (
          this.state.specialModeActivated &&
          message['display-name'] === 'yeokka' &&
          message.message.startsWith('!!theme')
        ) {
          let cssURL = message.split(' ')[1]
          let themes: any = window.localStorage.getItem('theme')
          let keyword = null
          if (themes) themes = JSON.parse(themes)
          else themes = { default: '../stylesheets/bridgebbcc_default.css' }

          if (themes[cssURL]) {
            keyword = cssURL
            cssURL = themes[cssURL]
          }
          window.localStorage.setItem('cssURL', cssURL)
          const stylesheet = document.getElementById('chat-theme')

          this.addChat({
            username: 'Internal Service',
            message: `Loaded theme ${keyword ? keyword : cssURL}.`,
          })
          if (stylesheet !== null) stylesheet.setAttribute('href', cssURL)
        } else {
          this.addChat(userstate)
        }
      }.bind(this)
    )
    irc.on('host', (channel: any, target: string, viewers: any) => {
      this.setState({
        streamer: target,
      })
    })

    let jsons: AxiosResponse<YDCConResponse>
    switch (this.state.streamer) {
      case 'thy2134':
      case 'yeokka':
        console.log('Loading yeokka DCCon...')
        jsons = await Axios.get(
          'https://watert.gitlab.io/emotes/yeokka/ODF.json'
        )

        const items: { [kwd: string]: string } = {}
        jsons.data.dccons.forEach(item => {
          item.keywords.forEach(kwd => {
            items[kwd] = item.path
          })
        })
        this.setState({
          dcCon: items,
        })

        break
      case 'funzinnu':
        console.log('Loading funzinnu DCCon...')
        jsons = await Axios.get('http://funzinnu.cafe24.com/stream/dccon.php')

        this.setState({
          dcCon: jsons.data,
        })
        break
    }
    if (this.state.streamer !== '#') {
      console.log('Loading badge for ' + this.state.streamer + '...')
      let userId = await Axios.get(
        'https://api.twitch.tv/helix/users?login=' + this.state.streamer,
        { headers: { 'Client-ID': 'azoulwf5023j77d8qbuhidthgw9pg9' } }
      )
      userId = userId.data.data[0].id
      let channelBadges = await Axios.get(
        `https://badges.twitch.tv/v1/badges/channels/${userId}/display`
      )
      channelBadges = channelBadges.data.badge_sets
      let globalBadges = await Axios.get(
        'https://badges.twitch.tv/v1/badges/global/display'
      )
      globalBadges = globalBadges.data.badge_sets
      this.setState({
        badges: Object.assign({}, globalBadges, channelBadges),
      })
    }

    this.setState({
      irc,
    })
  }

  public getColor(username: string) {
    if (!this.state.users[username]) {
      this.state.users[username] = Math.floor(Math.random() * 7) + 1
    }
    return this.state.users[username]
  }

  public replaceRange(
    s: string,
    start: number,
    end: number,
    substitute: string
  ) {
    return s.substring(0, start) + substitute + s.substring(end)
  }

  public addChat(item: IChatType) {
    const colorOption = window.localStorage.getItem('Chat-Color')
    item.message = linkifyUrls(item.message)
    // console.log('addChat Fired')
    const body = document.createElement('div')
    body.classList.add('chat_outer_box')
    body.classList.add('user_' + item['display-name'])

    const upperBox = document.createElement('div')
    upperBox.classList.add('chat_upper_box')

    const nicknameBox = document.createElement('div')
    nicknameBox.classList.add('chat_nickname_box')
    nicknameBox.innerText = item['display-name']
      ? item['display-name']
      : item.username
    if (colorOption === 'username' || colorOption === 'both') {
      nicknameBox.style.color = item.color ? item.color : '#FFFFFF'
    }

    const badgeBox = document.createElement('div')
    badgeBox.classList.add('chat_badge_box')

    upperBox.appendChild(nicknameBox)
    upperBox.appendChild(badgeBox)

    const lowerBox = document.createElement('div')
    lowerBox.classList.add('chat_lower_box')

    const chatMsgBox = document.createElement('div')
    chatMsgBox.classList.add('chat_msg_box')
    if (colorOption === 'chat' || colorOption === 'both') {
      chatMsgBox.style.color = item.color ? item.color : '#FFFFFF'
    }

    if (item['emotes-raw']) {
      const rawEmotes: string[] = item['emotes-raw'].split('/')
      const emojis: { [key: string]: string } = {}
      for (const key in rawEmotes) {
        if (rawEmotes.includes(key)) {
          rawEmotes[key]
            .split(':')[1]
            .split(',')
            .forEach(
              range =>
                (emojis[
                  item.message.substring(
                    parseInt(range.split('-')[0], 10),
                    parseInt(range.split('-')[1], 10) + 1
                  )
                ] = rawEmotes[key].split(':')[0])
            )
        }
      }

      const emojiKeys = Object.keys(emojis)
      item.message = item.message
        .split(' ')
        .map((item, index) => {
          if (emojiKeys.indexOf(item) !== -1) {
            const img = document.createElement('img')
            img.setAttribute(
              'src',
              `https://static-cdn.jtvnw.net/emoticons/v1/${emojis[item]}/1.0`
            )
            img.setAttribute('alt', emojis[item])
            img.classList.add('twitch_emote')
            return img.outerHTML
          } else {
            return item
          }
        })
        .join(' ')
    }

    if (item['badges-raw']) {
      badgeBox.innerHTML = item['badges-raw']
        .split(',')
        .map(item => {
          const img = document.createElement('img')
          img.classList.add('badge_img')
          img.setAttribute(
            'src',
            this.state.badges[item.split('/')[0]].versions[item.split('/')[1]]
              .image_url_4x
          )
          img.setAttribute(
            'alt',
            this.state.badges[item.split('/')[0]].versions[item.split('/')[1]]
              .description
          )
          return img.outerHTML
        })
        .join(' ')
    }
    const chatElement = document.getElementById('chat')
    if (chatElement == null) return
    const scrollDiff = chatElement.scrollHeight - chatElement.scrollTop

    chatMsgBox.innerHTML +=
      (this.state.streamer === 'yeokka' ||
        this.state.streamer === 'thy2134' ||
        this.state.streamer === 'funzinnu') &&
      item.message.indexOf('~') !== -1
        ? this.getCons(item.message)
        : item.message

    lowerBox.appendChild(chatMsgBox)

    body.appendChild(upperBox)
    body.appendChild(lowerBox)

    const chatWrapper = document.getElementById('chat_wrapper')
    const chatOuterBox = document.querySelectorAll('div.chat_outer_box')

    if (chatWrapper === null || chatOuterBox === null) return

    chatWrapper.innerHTML += body.outerHTML
    if (document.querySelectorAll('div.chat_outer_box').length > 120) {
      chatWrapper.removeChild(chatWrapper.children[0])
    }

    chatWrapper.scrollTop = chatWrapper.scrollHeight
  }

  public getCons(message: string) {
    return message
      .trim()
      .split(' ')
      .map((item, index) => {
        if (item.length === 0) return ''
        else if (item.startsWith('~') && this.state.dcCon[item.substring(1)]) {
          const img = document.createElement('img')
          img.setAttribute('src', this.state.dcCon[item.substring(1)])
          img.setAttribute('title', item)
          img.setAttribute('alt', item)
          img.classList.add('dccon')
          return img.outerHTML
        } else {
          const span = document.createElement('span')
          span.innerText = ' ' + item
          return span.outerHTML
        }
      })
      .join(' ')
  }

  public handleChange(event: ChangeEvent<HTMLInputElement>) {
    this.setState({
      chat: event.target.value,
    })
  }

  public handleKey(e: KeyboardEvent<{}>) {
    // e.preventDefault()
    const m = clone(this.state.keymap)
    m[e.keyCode] = e.type === 'keydown'

    if (m[13] === true && m[91] === true) {
      document.querySelectorAll('#text-area textarea').forEach((item: any) => {
        if (item.value === this.state.chat) {
          item.value += '\n'
          return false
        }
      })
      m[13] = false
      m[91] = false
    } else if (m[13] === true) {
      e.preventDefault()
      this.sendChat(e)
      m[13] = false
    }

    this.setState({
      keymap: m,
    })
  }

  public sendChat(e: any) {
    if (this.state.sendingChat) return
    if (
      this.state.chat.length !== 0 &&
      this.state.irc.readyState() === 'OPEN'
    ) {
      this.setState({
        sendingChat: true,
      })
      if (this.state.chat.startsWith('!!theme')) {
        let cssURL = this.state.chat.split(' ')[1]
        let keyword = null
        const themeRawString = window.localStorage.getItem('theme')
        let themes: { [key: string]: string }
        if (themeRawString) themes = JSON.parse(themeRawString)
        else themes = { default: '../stylesheets/bridgebbcc_default.css' }

        if (themes[cssURL]) {
          keyword = cssURL
          cssURL = themes[cssURL]
        }
        window.localStorage.setItem('cssURL', cssURL)
        const stylesheet = document.getElementById('chat-theme')

        this.addChat({
          username: 'Internal Service',
          message: `Loaded theme ${keyword ? keyword : cssURL}.`,
        })
        if (stylesheet !== null) stylesheet.setAttribute('href', cssURL)
      } else if (this.state.chat.startsWith('!!setOption')) {
        switch (this.state.chat.split(' ')[1]) {
          case 'chatColor':
            const option = this.state.chat.split(' ')[2]
            if (
              !(
                option === 'username' ||
                option === 'chat' ||
                option === 'none' ||
                option === 'both'
              )
            ) {
              this.addChat({
                username: 'Internal Service',
                message: 'Invalid argument supplied.',
              })
            } else {
              window.localStorage.setItem('Chat-Color', option)
              this.addChat({
                username: 'Internal Service',
                message: 'Updated Chat Color option.',
              })
            }
            break
        }
      } else if (
        this.state.chat.startsWith(
          '!!setMode SpecialMode_' +
            window.require('electron').remote.app.getVersion()
        )
      ) {
        this.setState({
          specialModeActivated: true,
        })
      } else if (
        this.state.chat.startsWith(
          '!!stopMode SpecialMode_' +
            window.require('electron').remote.app.getVersion()
        )
      ) {
        this.setState({
          specialModeActivated: false,
        })
      } else if (
        this.state.specialModeActivated &&
        this.state.chat.startsWith('!!sendIPC') &&
        this.state.chat.split(' ').length >= 2
      ) {
        ipcRenderer.send(
          this.state.chat.split(' ')[1],
          JSON.parse(
            this.state.chat
              .split(' ')
              .slice(2)
              .join(' ')
          )
        )
      } else {
        console.log(this.state.irc)
        this.state.irc.say(this.state.irc.getChannels()[0], this.state.chat)
      }
      document.querySelectorAll('#text-area textarea').forEach((item: any) => {
        if (item.value === this.state.chat) {
          item.value = ''
          return false
        }
      })
      this.setState({
        sendingChat: false,
        chat: '',
      })
    }
  }

  public render() {
    return (
      <div id="chat">
        <link
          rel="stylesheet"
          href="../stylesheets/bridgebbcc_default.css"
          id="chat-theme"
        />
        <div id="chat_wrapper" />
        <Card>
          <CardContent>
            <div id="send-chat-card">
              <div id="text-area">
                <TextField
                  disabled={this.props.authInfo.refreshToken === ''}
                  multiline={true}
                  label="Chat Contents"
                  fullWidth={true}
                  onChange={this.handleChange}
                  onKeyUp={this.handleKey}
                  onKeyDown={this.handleKey}
                />
              </div>
              <div id="send-button">
                <Button
                  id="send-chat"
                  disabled={this.props.authInfo.refreshToken === ''}
                  color="primary"
                  onClick={this.sendChat}
                >
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

const mapStateToProps = (
  state: { authReducer: AuthState },
  ownProps: IChatBaseProps
): IChatStateProps => {
  return {
    authInfo: state.authReducer,
    ...ownProps,
  }
}

export default connect<
  IChatStateProps,
  any,
  IChatBaseProps,
  { authReducer: AuthState }
>(mapStateToProps)(withRouter(ChatPage))
