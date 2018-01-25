#!/bin/sh

# Clear old packages
rm -rf dist
# Just for double-checking
npm i
npm update
# Compile JSX to pure JS
webpack
# Make Windows/Darwin Packages using Electron-Packager
electron-packager . ElecTwitch --asar --platform darwin,win32 --arch x64 --out dist/ --ignore=dist --ignore=react --verbose
# Create Windows Installable Package
node scripts/installer.js
# Create macOS DMG
node_modules/.bin/electron-installer-dmg dist/ElecTwitch-darwin-x64/ElecTwitch.app dist/ElecTwitch