var electronInstaller = require('electron-winstaller');

getInstallerConfig()
  .then(electronInstaller.createWindowsInstaller)
  .then(() => {
      console.log('It worked!')
  })
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer')

  return Promise.resolve({
    appDirectory: 'dist/win/ElecTwitch-win32-x64',
    outputDirectory: 'dist/win/installer-win32-x64',
    exe: 'ElecTwitch.exe',
    setupExe: 'ElecTwitchSetup.exe',
    setupIcon: 'images/electron.ico',
    authors: 'Kyujin Cho', 
    description: 'Simple Twitch Player built with Electron'
})
}

