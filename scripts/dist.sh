#!/bin/sh

# Clear old packages
yarn clean
# Just for double-checking
yarn install
# Compile JSX to pure JS
yarn run bldReact --mode production
yarn run bldElectron
# Make Windows/Darwin Packages using Electron-Packager
DEBUG=electron-packager electron-packager . ElecTwitch --asar --platform darwin --arch x64 --out dist/mac --ignore=dist --ignore=react --ignore="\.tsx?" --verbose --icon=images/electron.icns
DEBUG=electron-packager electron-packager . ElecTwitch --asar --platform win32 --arch x64 --out dist/win --ignore=dist --ignore=react --verbose  --ignore="\.tsx?" --icon=images/electron.png
# Create Windows Installable Package
node scripts/installer.js
# Create macOS DMG
node_modules/.bin/electron-installer-dmg dist/mac/ElecTwitch-darwin-x64/ElecTwitch.app dist/ElecTwitch