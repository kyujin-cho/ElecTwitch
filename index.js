const electron = require('electron');
const shell = electron.shell;

// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow} = electron;
const {ipcMain} = electron;
const axios = require('axios')
const secret = require('./secret')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win, chatWin;

function openChatWindow() {
  chatWin = new BrowserWindow({width: 250, height: 750});
  chatWin.loadURL('file://' + __dirname + '/views/chat.html');
  chatWin.on('closed', () =>  {
    chatWin = null
    console.log('Chat window closed')
  })
  const handleRedirect = (e, url) => {
    if(url.startsWith('file://')) return
    e.preventDefault()
    require('electron').shell.openExternal(url)
  }
  chatWin.setTitle('Chat')

  chatWin.webContents.on('will-navigate', handleRedirect)
  chatWin.webContents.on('new-window', handleRedirect)

  const mainWindowBound = win.getBounds();

  chatWin.setBounds({x:mainWindowBound.x + 930, y:mainWindowBound.y, width:250, height:750});
}

function followPlayer() {
  const bounds = win.getBounds()
  chatWin.setBounds({x: bounds.x + bounds.width, y: bounds.y, width: chatWin.getBounds().width, height: bounds.height})
}

function createWindow() {  
  // Create the browser window.
  win = new BrowserWindow({width: 930, height: 750});
  
  win.loadURL('file://' + __dirname + '/views/index.html');
  // and load the index.html of the app.

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
    if(chatWin)
    chatWin.close()
  });
  const handleRedirect = (e, url) => {
    e.preventDefault()
    require('electron').shell.openExternal(url)
  }
  
  win.webContents.on('will-navigate', handleRedirect)
  win.webContents.on('new-window', handleRedirect)
  let bothFocusRunning = false
  let block = false
  win.on('focus', () => {
    if(chatWin == null) return
    if(bothFocusRunning) {
      return
    }
    bothFocusRunning = true
    win.focus()
    setInterval(() => bothFocusRunning = false, 100)
  })

  win.focus()

  openChatWindow()
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

let chatInfo = {}
let sender = null
let interval = null
let followActivated = false

ipcMain.on('set-chat-info', (event, arg) => {
  clearInterval(interval)
  chatInfo = arg
  console.log('got chat info')
  console.log(arg)
  if(sender && chatWin)
    sender.send('chat-state-changed')
  if(chatInfo.authInfo)
    interval = setInterval(() => {
      axios.post('https://api.twitch.tv/kraken/oauth2/token', {
        refresh_token: chatInfo.authInfo.refreshToken,
        client_id: secret.api.clientId,
        client_secret: secret.api.secret
      })
      .then(data => {
        chatInfo.authInfo.password = 'oauth:' + data.data.access_token
        chatInfo.authInfo.refreshToken = data.data.refresh_token
        return
      })
    }, chatInfo.authInfo.expiresIn * 1000 - 100)
    
  event.returnValue = 'Done'
})

ipcMain.on('get-chat-info', (event, arg) => {
  console.log('chat info get')
  event.returnValue = chatInfo
})

ipcMain.on('register-chat-state-change', (event, arg) => {
  console.log('chat window sender opened')
  sender = event.sender
})

ipcMain.on('chatwin-status', (event, arg) => {
  event.sender.send((chatWin != null).toString())
  if(chatWin == null) openChatWindow()
  else chatWin.focus()
})

ipcMain.on('maximize', (event, arg) => {
  const workAreaSize = electron.screen.getPrimaryDisplay().workAreaSize
  if(chatWin) {
    win.setBounds({x: 0, y: 0, width: workAreaSize.width - 350, height: workAreaSize.height}, true)
    chatWin.setBounds({x: workAreaSize.width - 350, y: 0, width: 350, height: workAreaSize.height}, true)
  } else {
    win.setBounds({x: 0, y: 0, width: workAreaSize.width, height: workAreaSize.height}, true)
  }
    
  win.focus()
})

ipcMain.on('change-title', (event, arg) => {
  switch(arg.windowName) {
    case 'win':
      win.setTitle(arg.title)
      break
    case 'chatWin':
      chatWin.setTitle(arg.title)
      break
  }
  event.sender.send('title-changed', arg.title)
})

ipcMain.on('switch-chat-follow', (event, arg) => {
  if(followActivated) {
    win.removeListener('move', followPlayer)
    win.removeListener('resize', followPlayer)
  } else {
    win.on('move', followPlayer)
    win.on('resize', followPlayer)
    followPlayer()
  }
  followActivated = !followActivated
  event.returnValue = followActivated.toString()
})