var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: './dist/TestApp-win32-x64',
    outputDirectory: './dist/installer-win32-x64',
    exe: 'TestApp.exe',
    setupExe: 'MyAppSetup.exe',
    authors: 'Kyujin Cho', 
    description: 'Simple Twitch Player built with Electron'
});

resultPromise.then(function () {
    console.log("It worked!");
}, function (e) {
    console.log('No dice: ' + e.message);
});