#!/bin/sh

# Clear old packages
rm -rf dist
# Just for double-checking
npm i
npm update
# Compile JSX to pure JS
webpack
# Make Windows/Darwin Packages using Electron-Packager
DEBUG=electron-packager electron-packager . ElecTwitch --asar --platform win32 --arch x64 --out dist/win --ignore=dist --ignore=react --verbose --icon=images/electron.png
DEBUG=electron-packager electron-packager . ElecTwitch --asar --platform darwin --arch x64 --out dist/mac --ignore=dist --ignore=react --verbose --icon=images/electron.icns

# Create Windows Installable Package
node scripts/installer.js
# Create macOS DMG
node_modules/.bin/electron-installer-dmg dist/mac/ElecTwitch-darwin-x64/ElecTwitch.app dist/ElecTwitch