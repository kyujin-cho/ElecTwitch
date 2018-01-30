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
import GridList, { GridListTile, GridListTileBar } from 'material-ui/GridList';
import IconButton from 'material-ui/IconButton';
import Icon from '../node_modules/material-ui/Icon'
import StarBorderIcon from 'material-ui-icons/StarBorder';
import Paper from 'material-ui/Paper';
import { win32 } from 'path';

const {ipcRenderer} = window.require('electron')
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
        this.state = {streamerName: '', isChatFollowing: false, follow_streams: [], dcCon: {}, updateOpen: false, users: {}, client: null, chats: [], title: 'ElecTwitch', error: '', isLoaded: false, streamOn: false, accessToken: {}, streamInfo: {}, sig: '', dialogOpen: false}
    }

    async componentDidMount() {
        this.putChatInfo('#')
        const appVersion = window.require('electron').remote.app.getVersion()
        const newestVersion = await axios.get('https://api.github.com/repos/thy2134/ElecTwitch/releases')
        if (newestVersion.data[0].tag_name.split('-')[0].substring(1) > appVersion) {
            
            this.setState({
                updateOpen: true
            })
        }
        if(localStorage.getItem('Username') != null)
            await this.tryLogin()
        ipcRenderer.send('register-stream-state-change')
        ipcRenderer.on('stream-state-changed', (event, arg) => {
            const chatInfo = ipcRenderer.sendSync('get-chat-info')
            if(this.state.streamInfo.stream.channel.name != chatInfo.streamer) {
                this.openStream(chatInfo.streamer, false)
            }
        })
    }

    async tryLogin() {
        // Build the OAuth consent page URL
        var authWindow = new BrowserWindow({ width: 800, height: 600, show: false, 'node-integration': false })
        var twitchUrl = 'https://api.twitch.tv/kraken/oauth2/authorize?'
        var authUrl = twitchUrl + `client_id=${secret.api.clientId}&redirect_uri=http://localhost&response_type=code&scope=chat_login`
        authWindow.loadURL(authUrl);
        authWindow.show();

        let handleCallback = async function (url) {
            var raw_code = /code=([^&]*)/.exec(url) || null;
            var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
            var error = /\?error=(.+)$/.exec(url);

            console.log('Code: ' + code)
            console.log('Raw Code: ' + raw_code)
            console.log('URL: ' + url)

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
                const params = `client_id=${secret.api.clientId}`
                + `&client_secret=${secret.api.secret}`
                + `&code=${code}`
                + `&grant_type=authorization_code`
                + `&redirect_uri=http://localhost`
                const token = await axios.post('https://api.twitch.tv/kraken/oauth2/token?' + params, {})

                localStorage.setItem('OAuth-Token', token.data.access_token)
                localStorage.setItem('Refresh-Token', token.data.refresh_token)
                localStorage.setItem('Expire-Date', token.data.expires_in)

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

                
                const follows = await axios.get('https://api.twitch.tv/helix/users/follows?from_id=' + userData.data._id, {
                    headers: {
                        'Client-ID' : secret.api.clientId
                    }
                })
                
                let games = JSON.parse(window.localStorage.getItem('Games-JSON'))
                if(games === null)
                    games = {}
                let gamesToRetrieve = []
                let follow_streams = []
                const streams = await axios.get('https://api.twitch.tv/helix/streams?user_id=' + follows.data.data.map(item => item.to_id).join('&user_id='), {
                    headers: {
                        'Client-ID' : 'jzkbprff40iqj646a697cyrvl0zt2m6'                           
                    }
                })
                
                follow_streams = streams.data.data
                follow_streams.map(((item, index) => {
                    if(!games[item.game_id]) {
                        gamesToRetrieve.push({id: item.user_id, game_id: item.game_id})
                    }
                }))

                if(gamesToRetrieve.length > 0) {
                    const game = await axios.get('https://api.twitch.tv/helix/games?id=' + gamesToRetrieve.map(item => item.game_id).join('&id='), {
                        headers: {
                            'Client-ID': secret.api.clientId
                        }
                    })
                    game.data.data.forEach((item, index) => {
                        games[item.id] = item
                    })
                }

                const users = await axios.get('https://api.twitch.tv/helix/users?id=' + follow_streams.map(item => item.user_id).join('&id='), {
                    headers: {
                        'Client-ID' : secret.api.clientId
                    }
                })
                if(users.data.data) {
                    users.data.data.forEach(item => {
                        let i = 0
                        while(i < follow_streams.length && follow_streams[i].user_id != item.id) {
                            i++;
                        }
                        if(i == follow_streams.length)
                            return true;
                        else
                            follow_streams[i].game = item.name
                        follow_streams[i].display_name = item.display_name
                    })
                }
                
                window.localStorage.setItem('Games-JSON', JSON.stringify(games))
                this.setState({
                    follow_streams: follow_streams
                })

                await this.putChatInfo('#')
                
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

    async putChatInfo(channel) {
        const res = ipcRenderer.send('set-chat-info', {
            authInfo: ((localStorage.getItem('OAuth-Token') !== null) ? {
                username: localStorage.getItem('Username'),
                password: "oauth:" + localStorage.getItem('OAuth-Token'),
                refreshToken: localStorage.getItem('Refresh-Token'),
                expiresIn: localStorage.getItem('Expire-Date')
            } : {
                username: "justinfan" + Math.floor(Math.random() * 100000),
                password: ""
            }),
            streamer: channel
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

    onClick(e) {
        this.openStream(new String(this.state.streamerName).toString(), true)
    }

    async openStream(userInfo, isClicked) {
        this.setState({
            error: ''
        })

        if(!isClicked) { 
            const userdata = await axios.get('https://api.twitch.tv/helix/users?id=' + userInfo, {
                headers: {
                    'Client-ID' : secret.api.clientId
                }
            })
            if(userdata.data) {
                
                userInfo = userdata.data.data[0].login
            } else {
                this.setState({
                    error: '그런 스트리머가 존재하지 않습니다.',
                    streamOn: false
                })
                return
            }        
        }

        const prev_user = (this.state.streamInfo.stream) ? this.state.streamInfo.stream.channel.name : ''
        let res
        let url = `https://api.twitch.tv/api/channels/${userInfo}/access_token?`
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
        this.setState({
            sig: res.data.sig,
            accessToken: res.data.token
        })
        const streamInfo = JSON.parse(res.data.token)
        
        url = `https://usher.ttvnw.net/api/channel/hls/${userInfo}.m3u8?`
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
        document.getElementsByClassName('following-streams')[0].classList.add('hidden')
        
        await this.putChatInfo(userInfo)
                
    
        this.setState({
            isLoaded: false,
            chats: null
        })
        this.setState({
            isLoaded: true,
            title: 'Watching ' + (this.state.streamInfo ? this.state.streamInfo.stream.channel.display_name : new String(userInfo))
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

    openChatIfClosed(e) {
        ipcRenderer.send('chatwin-status')
    }

    maximize(e) { 
        ipcRenderer.send('maximize')
    }

    followChatWindow(e) {
        const result = ipcRenderer.sendSync('switch-chat-follow')
        this.setState({
            isChatFollowing: result == 'true'
        })
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
                    <Button color="contrast" id="turn-follow-on-off-button" onClick={this.followChatWindow.bind(this)} >{this.state.isChatFollowing ? "Stop chat window from following Player": "Make chat window follow Player"} </Button>
                    <Button color="contrast" id="maximize-button" onClick={this.maximize.bind(this)} >Maximize Window</Button>
                    <Button color="contrast" id="open-chat-window-button" onClick={this.openChatIfClosed.bind(this)} >Open Chat Window</Button>
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
                    <FollowStreams streams={this.state.follow_streams} openStream={this.openStream.bind(this)} />
                </div>
            </div>
        )
    }
}

class HLSPlayer extends React.Component {
    constructor(props) {
        super(props)
        this.state = {client: null, viewers: 0}
    }

    getChatters() {
        axios.get('http://tmi.twitch.tv/group/user/funzinnu/chatters').then((chatters) => {
            this.setState({
                viewers: chatters.data.chatter_count
            })
        })
    }
    async componentDidMount() {
        this.getChatters.bind(this)()
        setInterval(this.getChatters.bind(this), 5 * 1000)
    }
    
    shouldComponentUpdate(nextProps, nextState) {
        if(JSON.stringify(nextProps.streamInfo) != JSON.stringify(this.props.streamInfo) && this.props.streamOn)
            this.refs.player.pause()
        return !((JSON.stringify(nextProps.isLoaded) == JSON.stringify(this.props.isLoaded)) && 
        (JSON.stringify(nextProps.streamInfo) == JSON.stringify(this.props.streamInfo)) && 
        (JSON.stringify(nextProps.accessToken) == JSON.stringify(this.props.accessToken)) && 
        (JSON.stringify(nextProps.sig) == JSON.stringify(this.props.sig)) && 
        (JSON.stringify(nextProps.streamOn) == JSON.stringify(this.props.streamOn)))
        // return (JSON.stringify(nextProps.streamInfo) != JSON.stringify(this.props.streamInfo));
    }

    componentDidUpdate() {
    }
    
    render() {
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
                playerArea = (<Player ref="player" autoPlay={this.props.streamOn}>
                    <HLSSource
                        isVideoChild
                        src={url}
                    />
                </Player>)
            } 
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
                                <div id="viewer_count">
                                    {this.state.viewers} watching
                                </div>
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
class FollowStreams extends React.Component {
    render() {
        let div = (<div> No Stream Yet! </div>)
        const games = JSON.parse(window.localStorage.getItem('Games-JSON'))
        if(this.props.streams.length > 0) {
            div = this.props.streams.map((item, index) => {
                return (
                <GridListTile key={item.img} onClick={() => this.props.openStream(item.user_id, false)}>
                    <img src={item.thumbnail_url.replace('{width}', '300').replace('{height}', '200')} alt={item.title} />
                    <GridListTileBar
                    title={item.display_name + ' playing ' + games[item.game_id].name}
                    className={"root title"}
                    
                    />
                </GridListTile>
                )
            })
        }
        return ( 
            <div className={"following-streams"}>
                <Paper className={'paper'} elevation={4}>
                    <div className="inside">
                        <Typography type="headline" component="h2">
                        Follows
                        </Typography>
                        <GridList className={'gridList'} cols={2.5}>
                            {div}
                        </GridList>
                    </div>
                </Paper>
            </div>
        )
    }
}


window.onload = () => {
    ReactDOM.render(<App />, document.getElementById('container'))
}