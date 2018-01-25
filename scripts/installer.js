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
    appDirectory: 'dist/ElecTwitch-win32-x64',
    outputDirectory: 'dist/installer-win32-x64',
    exe: 'ElecTwitch.exe',
    setupExe: 'ElecTwitchSetup.exe',
    authors: 'Kyujin Cho', 
    description: 'Simple Twitch Player built with Electron'
})
}

