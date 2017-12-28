import React from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import { Player } from 'video-react'
import tmi from 'tmi.js'
import HLSSource from './HLSSource'
import secret from '../secret'
import Button from '../node_modules/material-ui/Button'
import TextField from '../node_modules/material-ui/TextField'
import Tooltip from '../node_modules/material-ui/Tooltip'
import Card, { CardContent, CardMedia } from 'material-ui/Card';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import Dialog, {
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
  } from '../node_modules/material-ui/Dialog'
import Send from '../node_modules/material-ui-icons/Send'
import AddIcon from '../node_modules/material-ui-icons/Add'
import ModeEditIcon from '../node_modules/material-ui-icons/ModeEdit'

const {BrowserWindow} = window.require('electron').remote

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

class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {streamerName: '', updateOpen: false, users: {}, client: null, chats: [], title: 'ElecTwitch', error: '', isLoaded: false, streamOn: false, accessToken: {}, streamInfo: {}, sig: '', dialogOpen: false}
    }

    async componentDidMount() {
        if(localStorage.key['OAuth-Token'])
            this.openChat()
        const appVersion = window.require('electron').remote.app.getVersion()
        const newestVersion = await axios.get('https://api.github.com/repos/thy2134/ElecTwitch/releases')
        if (newestVersion.data[0].tag_name.split('-')[0].substring(1) > appVersion) {
            
            this.setState({
                updateOpen: true
            })
        }
    }

    async tryLogin() {
        // Build the OAuth consent page URL
        var authWindow = new BrowserWindow({ width: 800, height: 600, show: false, 'node-integration': false })
        var twitchUrl = 'https://api.twitch.tv/kraken/oauth2/authorize?'
        var authUrl = twitchUrl + `client_id=${secret.api.clientId}&redirect_uri=http://localhost&response_type=code&scope=chat_login`
        authWindow.loadURL(authUrl);
        authWindow.show();

        let handleCallback = async function (url) {
            console.log(url)
            console.log('Error:' + error)
            var raw_code = /code=([^&]*)/.exec(url) || null;
            var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
            var error = /\?error=(.+)$/.exec(url);

            console.log('Code: ' + code)
            console.log('Raw Code: ' + raw_code)
            
            console.log('URL: ' + url)
            console.log('Error:' + error)

            if(url.indexOf('https://passport.twitch.tv/two_factor/') != -1) {
                authWindow.loadURL(url);
                return;
            }

            if (code || error) {
                // Close the browser if code found or error
                authWindow.destroy();
            }

            // If there is a code, proceed to get token from github
            if (code) {
                console.log(code)
                this.openChat()
                const params = `client_id=${secret.api.clientId}`
                + `&client_secret=${secret.api.secret}`
                + `&code=${code}`
                + `&grant_type=authorization_code`
                + `&redirect_uri=http://localhost`
                const token = await axios.post('https://api.twitch.tv/kraken/oauth2/token?' + params, {})
                localStorage.setItem('OAuth-Token', token.data.access_token)
                localStorage.setItem('Refresh-Token', token.data.refresh_token)
                localStorage.setItem('Expire-Date', token.data.expiresIn)

                const userData = await axios.get('https://api.twitch.tv/kraken/user', {
                    headers: {
                        Accept: 'application/vnd.twitchtv.v5+json', 
                        'Client-ID': secret.api.clientId, 
                        Authorization: 'OAuth ' + token.data.access_token, 
                    }
                })

                localStorage.setItem('Username', userData.data.name)
                document.getElementById('login-button').disabled = true
                document.getElementById('login-button').innerText = 'Logged In'

                if(this.state.streamOn)
                    this.state.client.join('#' + this.state.streamInfo.stream.channel.name)
                
            } else if (error) {
                alert('Oops! Something went wrong and we couldn\'t' +
                'log you in using Github. Please try again.');
            }
        }
        handleCallback = handleCallback.bind(this)

        // Handle the response from GitHub - See Update from 4/12/2015

        authWindow.webContents.on('will-navigate', function (event, url) {
            handleCallback(url);
        });

        authWindow.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl) {
            handleCallback(newUrl);
        });
    }

    async openChat() {
        var options = {
            options: {
                debug: true,
                clientId: secret.api.clientId
            },
            connection: {
                reconnect: false
            },
            identity: {
                username: localStorage.getItem('Username'),
                password: "oauth:" + localStorage.getItem('OAuth-Token')
            }
        }
        console.log(options)
        
        const client = new tmi.client(options)
        client.connect()
        .catch(err => console.error(err))
        client.on("chat", (function (channel, userstate, message, self) {
            userstate.message = message
            this.addChat(userstate)
        }).bind(this))
        this.setState({
            client: client
        })
    }

    onChange(e) {
        this.setState({
            streamerName: e.target.value
        })
    }

    handleKey(e) {
        if(e.keyCode == 91) this.onClick(null)
    }

    handleUpdateDialogClose(e) {
        this.setState({
            updateOpen: false
        })
    }

    async goAndGetUpdate() {
        const shell = window.require('electron').shell
        let url = await axios.get('https://api.github.com/repos/thy2134/ElecTwitch/releases')
        url = url.data[0].html_url
        shell.openExternal(url)
        this.handleUpdateDialogClose(null)
    }

    async onClick(e) {
        this.setState({
            error: ''
        })

        const s_name_cpy = new String(this.state.streamerName)

        let res
        let url = `https://api.twitch.tv/api/channels/${this.state.streamerName}/access_token?`
        url += serialize({
            'adblock':'false', 
            'need_https':'false',
            'oauth_token':'',
            'platform':'web',
            'player_type':'site'
        })
        try {
            res = await axios.get(url, {
                headers: {'client-id': secret.api.clientId }
            })
        } catch(e) {
            this.setState({
                error: '그런 스트리머가 존재하지 않습니다.',
                streamOn: false
            })
            return
        }
        console.log(res.data)
        this.setState({
            sig: res.data.sig,
            accessToken: res.data.token
        })
        const streamInfo = JSON.parse(res.data.token)
        
        url = `https://usher.ttvnw.net/api/channel/hls/${this.state.streamerName}.m3u8?`
        url += serialize({
            'allow_source': 'true', 
            'baking_bread': 'false', 
            'fast_bread': 'false', 
            'player_backend': 'mediaplayer', 
            'rtqos': 'control', 
            'sig': this.state.sig,
            'token': this.state.accessToken
        })
        let isStreaming = await axios.get(`https://api.twitch.tv/kraken/streams/${streamInfo.channel_id}`, {
            headers: {
                Accept: 'application/vnd.twitchtv.v5+json',
                'Client-ID': secret.api.clientId 
            }
        })
        
        if(!isStreaming.data.stream) {
            let channelInfo = await axios.get(`https://api.twitch.tv/kraken/channels/${streamInfo.channel_id}`, {
                headers: {
                    Accept: 'application/vnd.twitchtv.v5+json',
                    'Client-ID': secret.api.clientId 
                }
            })

            this.setState({
                streamInfo: {stream: {channel: channelInfo.data}},
                streamOn: false
            })
            document.getElementById('title-area').classList.remove('streamer-on')
            document.getElementById('title-area').classList.add('streamer-off')
        } else {
            
            const badges = await axios.get('https://api.twitch.tv/kraken/chat/'+ isStreaming.data.stream.channel._id + '/badges',{
                headers: {
                    'Client-ID': secret.api.clientId ,
                    Accept: 'application/vnd.twitchtv.v5+json'
                }
            })
            isStreaming.data.badges = badges.data
            this.setState({
                streamInfo: isStreaming.data,
                streamOn: true
            })
            document.getElementById('title-area').classList.add('streamer-on')
            document.getElementById('title-area').classList.remove('streamer-off')
        }

        console.log(isStreaming)

        if(this.state.client && this.state.client.readyState() == 'OPEN') {
            if(this.state.client.getChannels().length != 0)
                this.state.client.part('#' + this.state.streamInfo.stream.channel.name)
                .then(() => this.state.client.join('#' + s_name_cpy))
            else
                this.state.client.join('#' + s_name_cpy)
        }
        
        console.log(isStreaming)
        
    
        this.setState({
            isLoaded: false,
            chats: null
        })
        this.setState({
            isLoaded: true,
            title: 'Watching ' + (this.state.streamInfo ? this.state.streamInfo.stream.channel.display_name : new String(this.state.streamerName))
        })
        document.getElementById('show-input').classList.remove('hidden')
        this.handleClose()
    }

    handleClose(e) { 
        this.setState({
            dialogOpen: false
        })
    }

    handleClickOpen(e) {
        this.setState({
            dialogOpen: true,
            error: ''
        })
    }

    getColor(username) {
        if(!this.state.users[username]) {
            this.state.users[username] = Math.floor(Math.random() * 7) + 1
        }
        return this.state.users[username]
    }

    getCons(message) { 
        return message.trim().split(' ').map((item, index) => {
            if(item.length == 0)
                return ''
            else if(item.startsWith('~') && this.state.dcCon[item.substring(1)]) {
                let img = document.createElement('img')
                img.setAttribute('src', this.state.dcCon[item.substring(1)])
                img.setAttribute('alt', item)
                img.classList.add('dc-con')
                return img.outerHTML
            } else {
                let span = document.createElement('span')
                span.innerText = (' ' + item)
                return span.outerHTML
            }
        })
    }
    
    replaceRange(s, start, end, substitute) {
        return s.substring(0, start) + substitute + s.substring(end);
    }

    addChat(item) {
        console.log(item)

        let body = document.createElement('div')
        let username = document.createElement('span')
        let message = document.createElement('span')

        username.classList.add('username')
        username.style.color = ((item.color) ? item.color : this.getColor(item.username))
        username.innerText = ((item['display-name'] == item.username || !item['display-name']) ? item.username : item['display-name'] + '(' + item.username + ')')
        
        let colon = document.createElement('span')
        colon.innerText = ':'
        message.classList.add('message')

        if(item['emotes-raw']) {
            item['emotes-raw'] = item['emotes-raw'].split('/')
            console.log(item['emotes-raw'])
            if(item['emote-only']) {
                item.message = item['emotes-raw'].map((item, index) => {
                    const emote = [item.split(':')[0]].concat(parseInt(item.split(':')[1].split('-')[0])).concat(parseInt(item.split(':')[1].split('-')[1]))
                    let img = document.createElement('img')
                    img.setAttribute('src', `https://static-cdn.jtvnw.net/emoticons/v1/${emote[0]}/1.0`)
                    img.setAttribute('alt', emote[0])
                    img.classList.add('emotes')
                    return img.outerHTML
                }).join(' ')
            } else {
                item['emotes-raw'].forEach((item, index) => {
                    const emote = [item.split(':')[0]].concat(parseInt(item.split(':')[1].split('-')[0])).concat(parseInt(item.split(':')[1].split('-')[1]))
                    
                    console.log(emote)
                    let img = document.createElement('img')
                    img.setAttribute('src', `https://static-cdn.jtvnw.net/emoticons/v1/${emote[0]}/1.0`)
                    img.setAttribute('alt', item.message.substring(emote[1], emote[2] + 1))
                    img.classList.add('emotes')
                    item.message = this.replaceRange(item.message, emote[1], emote[2] + 1, img.outerHTML)
                })
            }
        }
        
        // message.innerHTML += (((this.props.streamerName == 'yeokka' || this.props.streamerName == 'Funzinnu') && item.message.indexOf('~') != -1) ? this.getCons(item.message) : item.message)
        message.innerHTML += (((this.props.streamerName == 'yeokka') && item.message.indexOf('~') != -1) ? this.getCons(item.message) : item.message)
        
        body.appendChild(username)
        body.appendChild(colon)
        body.appendChild(message)

        document.getElementById('chat').innerHTML += body.outerHTML
        if(document.querySelectorAll('div#chat > div').length > 120)
            document.getElementById('chat').removeChild(document.querySelector('div#chat > div'))

        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight
    }

    render() {
        return (
            <div>
                <AppBar position="static">
                    <Toolbar>
                    {/* <IconButton className={classes.menuButton} color="contrast" aria-label="Menu">
                        <MenuIcon />
                    </IconButton> */}
                    <Typography id="title-area" type="title" color="inherit" style={{flex: 1}}>
                        {this.state.title}
                    </Typography>
                    <Button color="contrast" id="login-button" onClick={this.tryLogin.bind(this)} >Login</Button>
                    </Toolbar>
                </AppBar>
                <div id="main">
                    <Tooltip title="Open Stream" placement="bottom">
                    <Button id="open-stream" fab color="primary" onClick={this.handleClickOpen.bind(this)}><AddIcon /></Button>
                    </Tooltip>
                    <Dialog
                    open={this.state.dialogOpen}
                    onClose={this.handleClose.bind(this)}
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
                            onChange={this.onChange.bind(this)}
                            fullWidth
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.handleClose.bind(this)} color="primary">
                            Cancel
                            </Button>
                            <Button onClick={this.onClick.bind(this)} color="primary">
                            Go <Send className="icon-right" />
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                            open={this.state.updateOpen}
                            onClose={this.handleUpdateDialogClose.bind(this)}
                            aria-labelledby="alert-dialog-title"
                            aria-describedby="alert-dialog-description"
                        >
                        <DialogTitle id="update-dialog-title">{"Cool Update for the Cool Guys"}</DialogTitle>
                        <DialogContent>
                            <DialogContentText id="update-dialog-description">
                            {"All the finest Twitch users get their update asap. Why don't you go and get some too?"}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.handleUpdateDialogClose.bind(this)} color="primary">
                            Close
                            </Button>
                            <Button onClick={this.goAndGetUpdate.bind(this)} color="primary" autoFocus>
                            Take me to the Download Page
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <div id="show-input" onClick={() => document.getElementById('streamer-input').classList.remove('hidden')} className="hidden" />
                    <HLSPlayer className="hidden" isLoaded={this.state.isLoaded} streamOn={this.state.streamOn} accessToken={this.state.accessToken} sig={this.state.sig} streamInfo={this.state.streamInfo}/>
                </div>
                <Chatroom irc={this.state.client} streamerName={new String((this.state.streamInfo.stream) ? this.state.streamInfo.stream.channel.display_name : '')} />
            </div>
        )
    }
}

class HLSPlayer extends React.Component {
    constructor(props) {
        super(props)
        this.state = {client: null}
    }
    
    shouldComponentUpdate(nextProps, nextState) {
        console.log('====')
        console.log(!(JSON.stringify(nextProps.isLoaded) == JSON.stringify(this.props.isLoaded)) && 
        (JSON.stringify(nextProps.streamInfo) == JSON.stringify(this.props.streamInfo)) && 
        (JSON.stringify(nextProps.accessToken) == JSON.stringify(this.props.accessToken)) && 
        (JSON.stringify(nextProps.sig) == JSON.stringify(this.props.sig)) && 
        (JSON.stringify(nextProps.streamOn) == JSON.stringify(this.props.streamOn)))
        console.log('====')
        return !((JSON.stringify(nextProps.isLoaded) == JSON.stringify(this.props.isLoaded)) && 
        (JSON.stringify(nextProps.streamInfo) == JSON.stringify(this.props.streamInfo)) && 
        (JSON.stringify(nextProps.accessToken) == JSON.stringify(this.props.accessToken)) && 
        (JSON.stringify(nextProps.sig) == JSON.stringify(this.props.sig)) && 
        (JSON.stringify(nextProps.streamOn) == JSON.stringify(this.props.streamOn)));
        // return (JSON.stringify(nextProps.streamInfo) != JSON.stringify(this.props.streamInfo));
    }
    
    render() {
        console.log('Reloading...')
        let body = <div className="hidden">Not Loaded!</div>
        if(this.props.isLoaded) {
            let url = 'http://localhost'
            let playerArea = <img src={this.props.streamInfo.stream.channel.video_banner} style={{
                width: '100%',
                height: '100%'
            }} />
            if(this.props.streamOn) {
                url = `https://usher.ttvnw.net/api/channel/hls/${this.props.streamInfo.stream.channel.name.toLowerCase()}.m3u8?`
                url += serialize({
                    'allow_source': 'true', 
                    'baking_bread': 'false', 
                    'fast_bread': 'false', 
                    'player_backend': 'mediaplayer', 
                    'rtqos': 'control', 
                    'sig': this.props.sig,
                    'token': this.props.accessToken
                })
                const isStreamerOn = axios.get(url)
                playerArea = (<Player autoPlay={this.props.streamOn}>
                    <HLSSource
                        isVideoChild
                        src={url}
                    />
                </Player>)
            } else
                console.log(this.props.streamInfo)
            body = (
                <div id="player">
                    {playerArea}
                    <div style={{
                        display: 'inline-block',
                        width: '100%',
                        marginTop: '10px'
                    }}>
                        <Card id="streamer-info" style={{float: 'left'}}>
                            <div>
                            <CardContent style={{
                                flex: '1 0 auto',
                            }}>
                                <Typography type="headline">{this.props.streamInfo.stream.channel.status}</Typography>
                                <Typography type="subheading" color="secondary">
                                {this.props.streamInfo.stream.channel.display_name + ' playing ' + this.props.streamInfo.stream.channel.game}
                                </Typography>
                            </CardContent>
                            </div>
                        </Card>
                        <a href={this.props.streamInfo.stream.channel.url} > 
                        <img
                            className="profile-photo"
                            src={this.props.streamInfo.stream.channel.logo}
                            alt={this.props.streamInfo.stream.channel.display_name}
                        ></img>
                        </a>
                        
                    </div>
                </div>
            )
            
            
        }
        return body
    }
}

class Chatroom extends React.Component {
    // Ta-Da
    constructor(props) {
        super(props)
        this.state = {chat: '', keymap: {}, users: {}, dcCon: {}, index: 0}
    }

    async componentWillReceiveProps(newProps) {
        console.log(JSON.stringify(newProps.streamerName) + ', ' + JSON.stringify(this.props.streamerName))
        if(JSON.stringify(newProps.chats) != JSON.stringify(this.props.chats)) {
            this.addChat(newProps.chats)
        }
        if(JSON.stringify(newProps.streamerName) != JSON.stringify(this.props.streamerName)) {
            console.log('Chatroom (re)loaded! ')
            console.log(newProps.streamerName)
            if(newProps.streamerName == 'yeokka') {
                axios.get('https://krynen.github.io/jsassist-custom-css/js/dccon_list.json')
                .then((jsons) => { 
                    let items = {}
                    console.log(jsons)
                    jsons = jsons.data
                    jsons.dccons.forEach((item) => {
                        item.keywords.forEach((kwd) => {
                            console.log(kwd + ':' + item.path)
                            items[kwd] = item.path
                        })
                    })
                    this.setState({
                        dcCon: items
                    })
    
                })
            // } else if(newProps.streamerName == 'Funzinnu') {
            //     axios.get('http://funzinnu.cafe24.com/stream/dccon.php')
            //     .then((jsons) => {
            //         console.log(jsons.data['고마워미도리'])
            //         this.setState({
            //             dcCon: jsons.data
            //         })
            //     })
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (JSON.stringify(nextProps.chats) == JSON.stringify(this.props.chats));
    }

    componentDidUpdate() {
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight
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
        if(this.state.chat.length != 0 && this.props.irc.readyState() == 'OPEN') {
            this.props.irc.say(this.props.irc.getChannels()[0], this.state.chat)
            document.querySelectorAll('#text-area textarea').forEach((item, index) => {
                if(item.value == this.state.chat) {
                    item.value = ''
                    return false
                }
            })
        }
    }

    

    render() {
        return (
            <div id="chat-area">
                <Card>
                    <CardContent>
                        <div id="chat"></div>
                        <div id="send-chat-card">
                            <div id="text-area">
                                <TextField disabled={!this.props.irc} multiline={true} label="Chat Contents" fullWidth={true} onChange={this.handleChange.bind(this)} onKeyUp={this.handleKey.bind(this)} onKeyDown={this.handleKey.bind(this)} />
                            </div>
                            <div id="send-button">
                                <Button id="send-chat" disabled={!this.props.irc} fab color="accent" onClick={this.sendChat.bind(this)}><ModeEditIcon /></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }
}


window.onload = () => {
    ReactDOM.render(<App />, document.getElementById('container'))
}