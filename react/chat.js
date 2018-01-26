import React from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import tmi from 'tmi.js'
import secret from '../secret'

import Button from '../node_modules/material-ui/Button'
import TextField from '../node_modules/material-ui/TextField'
import Card, { CardContent, CardMedia } from 'material-ui/Card';
import ModeEditIcon from '../node_modules/material-ui-icons/ModeEdit'

const { ipcRenderer } = window.require('electron')


const serialize = function(obj) {
    var str = [];
    for(var p in obj)
       str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    return str.join("&");
}

const clone = function(obj) {
    if (obj === null || typeof(obj) !== 'object')
    return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = obj[attr];
      }
    }
    return copy;
}



class ChatApp extends React.Component {
    constructor(props) {
        super(props)
        this.state = {chatInfo: {}, dcCon: {}, irc: null, chat: '', sendingChat: false, keymap: {}, users: {}, index: 0}
    }

    async componentDidMount() {
        ipcRenderer.send('register-chat-state-change', '')
        ipcRenderer.on('chat-state-changed', () => window.location.reload())
        const chatInfo = ipcRenderer.sendSync('get-chat-info')
        if(!chatInfo) return

        let cssURL = window.localStorage.getItem('cssURL')
        if(!cssURL) {
            cssURL = '../stylesheets/chat.css'
            window.localStorage.setItem('cssURL', cssURL)
        }

        let stylesheet = document.createElement('link')
        stylesheet.id = 'chat-theme'
        stylesheet.setAttribute('rel', 'stylesheet')
        stylesheet.setAttribute('href', cssURL)
        document.head.appendChild(stylesheet)

        const irc = new tmi.client({
            options: {
                debug: true,
                clientId: secret.api.clientId
            },
            connection: {
                reconnect: false
            },
            identity: chatInfo.authInfo
        })

        irc.connect().then(() => {
            if(chatInfo.streamer != '#')
                irc.join(chatInfo.streamer)
          })
          .catch(err => console.error(err))
        irc.on("message", (function (channel, userstate, message, self) {
            userstate.message = message
            this.addChat(userstate)
        }).bind(this))
    

        let jsons
        switch(chatInfo.streamer) {
            case 'yeokka' :
                console.log('Loading yeokka DCCon...')
                jsons = await axios.get('https://krynen.github.io/jsassist-custom-css/js/dccon_list.json')
                
                let items = {}
                jsons = jsons.data
                jsons.dccons.forEach((item) => {
                    item.keywords.forEach((kwd) => {
                        console.log(kwd + ':' + item.path)
                        items[kwd] = item.path
                    })
                })
                console.log(items)
                this.setState({
                    dcCon: items
                })
            
                break;
            case 'funzinnu':
                console.log('Loading funzinnu DCCon...')
                jsons = await axios.get('http://funzinnu.cafe24.com/stream/dccon.php')

                console.log(jsons.data)
                this.setState({
                    dcCon: jsons.data
                })
            
            
                break;
        }
        this.setState({
            chatInfo: chatInfo,
            irc: irc
        }) 

    }

    getColor(username) {
        if(!this.state.users[username]) {
            this.state.users[username] = Math.floor(Math.random() * 7) + 1
        }
        return this.state.users[username]
    }

    replaceRange(s, start, end, substitute) {
        return s.substring(0, start) + substitute + s.substring(end);
    }

    addChat(item) {
        // console.log(item)
        // console.log('addChat Fired')
        let body = document.createElement('div')
        body.classList.add('chat_outer_box')
        body.classList.add('user_' + item['display-name'])

        let upper_box = document.createElement('div')
        upper_box.classList.add('chat_upper_box')
        
        let nickname_box = document.createElement('div')
        nickname_box.classList.add('chat_nickname_box')
        nickname_box.style.color = ((item.color) ? item.color : this.getColor(item.username))
        nickname_box.innerText = ((item['display-name'] == item.username || !item['display-name']) ? item.username : item['display-name'] + '(' + item.username + ')')
        
        let badge_box = document.createElement('div')
        badge_box.classList.add('chat_badge_box')
        badge_box.classList.add('empty') // Will be implemented later

        upper_box.appendChild(nickname_box)
        upper_box.appendChild(badge_box)

        let lower_box = document.createElement('div')
        lower_box.classList.add('chat_lower_box')

        let chat_msg_box = document.createElement('div')
        chat_msg_box.classList.add('chat_msg_box')

        if(item['emotes-raw']) {
            item['emotes-raw'] = item['emotes-raw'].split('/')
            console.log(item['emotes-raw'])
            if(item['emote-only']) {
                item.message = item['emotes-raw'].map((item, index) => {
                    const emote = [item.split(':')[0]].concat(parseInt(item.split(':')[1].split('-')[0])).concat(parseInt(item.split(':')[1].split('-')[1]))
                    let img = document.createElement('img')
                    img.setAttribute('src', `https://static-cdn.jtvnw.net/emoticons/v1/${emote[0]}/1.0`)
                    img.setAttribute('alt', emote[0])
                    img.classList.add('twitch_emote')
                    return img.outerHTML
                }).join(' ')
            } else {
                item['emotes-raw'].forEach((item, index) => {
                    const emote = [item.split(':')[0]].concat(parseInt(item.split(':')[1].split('-')[0])).concat(parseInt(item.split(':')[1].split('-')[1]))
                    
                    console.log(emote)
                    let img = document.createElement('img')
                    img.setAttribute('src', `https://static-cdn.jtvnw.net/emoticons/v1/${emote[0]}/1.0`)
                    if(item.message)
                        img.setAttribute('alt', item.message.substring(emote[1], emote[2] + 1))
                    img.classList.add('twitch_emote')
                    item.message = this.replaceRange(item.message, emote[1], emote[2] + 1, img.outerHTML)
                })
            }
        }
        const scrollDiff = document.getElementById('chat').scrollHeight - document.getElementById('chat').scrollTop
        
        console.log('StreamerName:')
        console.log()
        console.log('IsEmoji:' + ((this.state.chatInfo.streamer == 'yeokka' || this.state.chatInfo.streamer == 'funzinnu') && item.message.indexOf('~') != -1))
        chat_msg_box.innerHTML += (((this.state.chatInfo.streamer == 'yeokka' || this.state.chatInfo.streamer == 'funzinnu') && item.message.indexOf('~') != -1) ? this.getCons(item.message) : item.message)
        
        lower_box.appendChild(chat_msg_box)

        body.appendChild(upper_box)
        body.appendChild(lower_box)

        document.getElementById('chat_wrapper').innerHTML += body.outerHTML
        if(document.querySelectorAll('div.chat_outer_box').length > 120)
            document.getElementById('chat_wrapper').removeChild(document.querySelector('div.chat_outer_box'))

        document.getElementById('chat_wrapper').scrollTop = (document.getElementById('chat_wrapper').scrollHeight - scrollDiff)
    }

    getCons(message) { 
        return message.trim().split(' ').map((item, index) => {
            if(item.length == 0)
                return ''
            else if(item.startsWith('~') && this.state.dcCon[item.substring(1)]) {
                let img = document.createElement('img')
                img.setAttribute('src', this.state.dcCon[item.substring(1)])
                img.setAttribute('title', item)
                img.setAttribute('alt', item)
                img.classList.add('dccon')
                return img.outerHTML
            } else {
                let span = document.createElement('span')
                span.innerText = (' ' + item)
                return span.outerHTML
            }
        }).join(' ')
    }

    handleChange(event) {
        this.setState({
            chat: event.target.value
        })
    }

    handleKey(e) {
        // e.preventDefault()
        let m = clone(this.state.keymap)
        m[e.keyCode] = e.type == 'keydown'
        
        if(m[13] == true && m[91] == true) {
            document.querySelectorAll('#text-area textarea').forEach((item, index) => {
                if(item.value == this.state.chat) {
                    item.value += '\n'
                    return false
                }
            })
            m[13] = false
            m[91] = false
        } else if(m[13] == true) {
            e.preventDefault()
            this.sendChat(e)
            m[13] = false
        }

        this.setState({
            keymap: m
        })
    }

    sendChat(e) {
        if(this.state.sendingChat)
            return
        if(this.state.chat.length != 0 && this.state.irc.readyState() == 'OPEN') {
            this.setState({
                sendingChat: true
            })
            if(this.state.chat.startsWith('!!theme')) { 
                let cssURL = this.state.chat.split(' ')[1]
                let themes = window.localStorage.getItem('theme')
                let keyword = null
                if(themes)
                    themes = JSON.parse(themes)
                else
                    themes = {'default': '../stylesheets/bridgebbcc_default.css'}

                if(themes[cssURL]) {
                    keyword = cssURL
                    cssURL = themes[cssURL]
                }
                window.localStorage.setItem('cssURL', cssURL)
                const stylesheet = document.getElementById('chat-theme')
                
                this.addChat({'username': 'Internal Service', 'message': `Loaded theme ${keyword ? keyword : cssURL}.`})
                stylesheet.setAttribute('href', cssURL)
            } else if (this.state.chat.startsWith('!!setTheme')) {
                if(this.state.chat.split(' ').length < 3) {
                    this.addChat({'username': 'Internal Service', 'message': 'Invalid argument supplied for setTheme command.'})
                } else {
                    let keyword = this.state.chat.split(' ')[1]
                    let url = this.state.chat.split(' ')[2]
                    let themes = window.localStorage.getItem('theme')
                    if(themes)
                        themes = JSON.parse(themes)
                    else
                        themes = {'default': '../stylesheets/bridgebbcc_default.css'}
    
                    if(keyword == 'default') {
                        this.addChat({'username': 'Internal Service', 'message': 'Cannot use "default" as theme preset - reserved keyword. '})
                    } else {
                        themes[keyword] = url
                        window.localStorage.setItem('theme', JSON.stringify(themes))
                        this.addChat({'username': 'Internal Service', 'message': `Updated theme ${keyword}.`})        
                    }                    
                }
            } else {
                this.state.irc.say(this.state.irc.getChannels()[0], this.state.chat)
            }
            document.querySelectorAll('#text-area textarea').forEach((item, index) => {
                if(item.value == this.state.chat) {
                    item.value = ''
                    return false
                }
            })
            this.setState({
                sendingChat: false,
                chat: ''
            })
        }
    }

    render() {
        return (
            <div id="chat" style={{
                background: 'grey'
            }}>
                <div id="chat_wrapper"></div>
                <Card>
                    <CardContent>
                        <div id="send-chat-card" style={{
                            textShadow: 'none'
                        }}>
                            <div id="text-area">
                                <TextField disabled={!this.state.irc} multiline={true} label="Chat Contents" fullWidth={true} onChange={this.handleChange.bind(this)} onKeyUp={this.handleKey.bind(this)} onKeyDown={this.handleKey.bind(this)} />
                            </div>
                            <div id="send-button">
                                <Button id="send-chat" disabled={!this.state.irc} fab color="accent" onClick={this.sendChat.bind(this)}><ModeEditIcon /></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }
}

window.onload = () => {
    ReactDOM.render(<ChatApp />, document.body)
}