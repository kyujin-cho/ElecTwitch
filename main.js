"use strict";
exports.__esModule = true;
var Electron = require("electron");
// tslint:disable-next-line:no-duplicate-imports
var electron_1 = require("electron");
var normalIcon = electron_1.nativeImage.createFromPath(__dirname + '/images/electron.png');
var badgeIcon = electron_1.nativeImage.createFromPath(__dirname + '/images/electron-badge.png');
var Main = /** @class */ (function () {
    function Main() {
    }
    Main.onWindowAllClosed = function () {
        if (process.platform !== 'darwin') {
            Main.application.quit();
        }
    };
    Main.onClose = function () {
        // Dereference the window object.
        Main.mainWindow = null;
    };
    Main.onReady = function () {
        Main.createWindow();
    };
    Main.unsetBadge = function () {
        if (Main.isUnread) {
            Main.application.dock.setIcon(normalIcon);
            Main.isUnread = false;
        }
    };
    Main.createWindow = function () {
        // Create the browser window.
        Main.mainWindow = new electron_1.BrowserWindow({ width: 930, height: 750 });
        Main.mainWindow.loadURL('file://' + __dirname + '/views/index.html');
        // and load the index.html of the app.
        // Emitted when the window is closed.
        Main.mainWindow.on('closed', Main.onClose);
        var handleRedirect = function (e, url) {
            e.preventDefault();
            console.log('Here, URL: ' + url);
            if (url.indexOf('file:') === 0) {
                if (Main.mainWindow != null)
                    Main.mainWindow.loadURL(url);
            }
            else {
                require('electron').shell.openExternal(url);
            }
        };
        Main.mainWindow.webContents.on('will-navigate', handleRedirect);
        Main.mainWindow.webContents.on('new-window', handleRedirect);
        if (process.platform === 'darwin') {
            Main.mainWindow.on('focus', Main.unsetBadge);
        }
        Main.mainWindow.focus();
        var template = [
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
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { accelerator: 'CmdOrCtrl+M', role: 'minimize' },
                    { accelerator: 'CmdOrCtrl+W', role: 'close' },
                    { accelerator: 'CmdOrCtrl+R', role: 'reload' },
                    { role: 'zoom' },
                    { type: 'separator' },
                    { role: 'front' },
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                    {
                        label: 'Redo',
                        accelerator: 'Shift+CmdOrCtrl+Z',
                        role: 'redo'
                    },
                    { type: 'separator' },
                    { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                    { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                    { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                    {
                        label: 'Select All',
                        accelerator: 'CmdOrCtrl+A',
                        role: 'selectAll'
                    },
                ]
            },
        ];
        electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
        if (process.platform === 'darwin')
            Main.application.dock.setIcon(normalIcon);
        Main.mainWindow.webContents.openDevTools();
    };
    Main.main = function (app, browserWindow) {
        // we pass the Electron.App object and the
        // Electron.BrowserWindow into this function
        // so this class has no dependencies. This
        // makes the code easier to write tests for
        Main.BrowserWindow = browserWindow;
        Main.application = app;
        Main.application.on('window-all-closed', Main.onWindowAllClosed);
        Main.application.on('ready', Main.onReady);
        app.on('window-all-closed', function () {
            // On OS X it is common for applications and their menu bar
            // to stay active until the user quits explicitly with Cmd + Q
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
        app.on('activate', function () {
            // On OS X it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (Main.mainWindow === null) {
                Main.createWindow();
            }
        });
        electron_1.ipcMain.on('chat', function (event, arg) {
            if (!Main.isUnread &&
                (Main.mainWindow != null && !Main.mainWindow.isFocused())) {
                Main.isUnread = true;
                if (process.platform === 'darwin')
                    app.dock.setIcon(badgeIcon);
            }
        });
        electron_1.ipcMain.on('change-title', function (event, arg) {
            switch (arg.windowName) {
                case 'win':
                    if (Main.mainWindow != null)
                        Main.mainWindow.setTitle(arg.title);
                    break;
            }
            event.sender.send('title-changed', arg.title);
        });
    };
    Main.BrowserWindow = Electron.BrowserWindow;
    Main.isUnread = false;
    return Main;
}());
exports["default"] = Main;
