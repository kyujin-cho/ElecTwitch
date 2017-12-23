# ElecTwitch
Very simple, feature-less twitch viewer application.   
Made with Electron and React.js. 

## Technical Specifications
- Backend
  - None
- Frontend
  - JS DOM
  - React.js
  - React-Video
  - tmi.js
- Database
  - localStorage
- Graphical
  - [Material-UI](https://github.com/mui-org/material-ui)
- Wrapping
  - Electron

## Installing built packages
Go to releases tab.

## Starting from the scratch
1. Make secret.js, which contains your API Secret key and Client ID.
The file should be formed like this -
```
module.exports = { 
    api: {
        clientId: '<Your client id>' ,
        secret: '<Your secret>'
    }
}
```
2. Clone repo.
3. Run `npm install` to install necessary package.
4. Run `node_modules/.bin/electron .` to start the viewer.

## Distributing
First follow the 'Starting from the scratch' part, then
1. Open dist.sh and change the name of project to whatever you want.
2. Run dist.sh
3. Built files will be placed in dist/ folder.

## Limitations
- Can't get chats while logged out. This is due to the limitation of Twitch IRC API.
