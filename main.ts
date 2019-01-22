import {
  BrowserWindow,
  nativeImage,
  Menu,
  MenuItemConstructorOptions,
  ipcMain,
  IpcMessageEvent,
} from 'electron'

const normalIcon = nativeImage.createFromPath(
  __dirname + '/images/electron.png'
)
const badgeIcon = nativeImage.createFromPath(
  __dirname + '/images/electron-badge.png'
)

export default class Main {
  private static mainWindow: Electron.BrowserWindow | null
  private static application: Electron.App
  private static BrowserWindow = Electron.BrowserWindow
  private static isUnread: boolean = false
  private static interval: NodeJS.Timeout
  private static onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      Main.application.quit()
    }
  }

  private static onClose() {
    // Dereference the window object.
    Main.mainWindow = null
  }

  private static onReady() {
    this.createWindow()
  }

  private static unsetBadge() {
    if (this.isUnread) {
      Main.application.dock.setIcon(normalIcon)
      this.isUnread = false
    }
  }

  public static createWindow() {
    // Create the browser window.
    Main.mainWindow = new BrowserWindow({ width: 930, height: 750 })

    Main.mainWindow.loadURL('file://' + __dirname + '/views/index.html')
    // and load the index.html of the app.

    // Emitted when the window is closed.
    Main.mainWindow.on('closed', this.onClose)
    const handleRedirect = (e: Event, url: string) => {
      e.preventDefault()
      require('electron').shell.openExternal(url)
    }

    Main.mainWindow.webContents.on('will-navigate', handleRedirect)
    Main.mainWindow.webContents.on('new-window', handleRedirect)
    if (process.platform === 'darwin') {
      Main.mainWindow.on('focus', this.unsetBadge)
    }

    Main.mainWindow.focus()

    const template: MenuItemConstructorOptions[] = [
      {
        label: Main.application.getName(),
        submenu: [
          { label: 'About Application', role: 'about' },
          { type: 'separator' },
          { role: 'services', submenu: [] },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { accelerator: 'CmdOrCtrl+M', role: 'minimize' },
          { accelerator: 'CmdOrCtrl+W', role: 'close' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', accelerator: 'CmdOrCtrl+Z' },
          {
            label: 'Redo',
            accelerator: 'Shift+CmdOrCtrl+Z',
          },
          { type: 'separator' },
          { label: 'Cut', accelerator: 'CmdOrCtrl+X' },
          { label: 'Copy', accelerator: 'CmdOrCtrl+C' },
          { label: 'Paste', accelerator: 'CmdOrCtrl+V' },
          {
            label: 'Select All',
            accelerator: 'CmdOrCtrl+A',
          },
        ],
      },
    ]

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
    if (process.platform === 'darwin') Main.application.dock.setIcon(normalIcon)
  }

  public static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for
    Main.BrowserWindow = browserWindow
    Main.application = app
    Main.application.on('window-all-closed', Main.onWindowAllClosed)
    Main.application.on('ready', Main.onReady)
    app.on('window-all-closed', () => {
      // On OS X it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    app.on('activate', () => {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (this.mainWindow === null) {
        this.createWindow()
      }
    })

    ipcMain.on('chat', (event: IpcMessageEvent, arg: any) => {
      if (
        !this.isUnread &&
        (this.mainWindow != null && !this.mainWindow.isFocused())
      ) {
        this.isUnread = true
        if (process.platform === 'darwin') app.dock.setIcon(badgeIcon)
      }
    })

    ipcMain.on('change-title', (event: IpcMessageEvent, arg: any) => {
      switch (arg.windowName) {
        case 'win':
          if (this.mainWindow != null) this.mainWindow.setTitle(arg.title)
          break
      }
      event.sender.send('title-changed', arg.title)
    })
  }
}
