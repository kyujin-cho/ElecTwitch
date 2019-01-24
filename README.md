# ElecTwitch

![Screenshot](https://github.com/thy2134/ElecTwitch/blob/master/images/screen-shot-1.png?raw=true)

Very simple, feature-less twitch viewer application.  
Made with Electron and React.js.

## Technical Specifications

- Backend
  - None
- Frontend
  - React-Router
  - React.js
  - React-Video
  - tmi.js
- Database
  - localStorage
- UI Libs
  - [Material-UI](https://github.com/mui-org/material-ui)
- Desktop App Wrapper
  - Electron

## Installing

### Installing built packages

Go to [releases tab](https://github.com/thy2134/ElecTwitch/releases), get to the latest release and download appropriate installation file based on your Operating System.

### Building from the source

1. Generate secret.ts inside react folder. This file will contain your API credentials. Twitch API key is essential for this app, since you need to obtain the OAuth token from the user in order to chat.
   The file should be formed like below -

```
export default {
    api: {
        clientId: '<Your client id>' ,
        secret: '<Your secret>'
    }
}
```

2. Clone repo.
3. Run `yarn install` to install necessary package.
4. Run `yarn webpack` to build sources.
5. Run `tsc App.ts && electron App.ts` to start the application.

#### Packaging

First follow the 'Building from the source' part, then

1. Open dist.sh and change the name of project to whatever you want.
2. Run dist.sh
3. Built files will be placed in dist/ folder.

## How do I start?

1. Log in using button above. Once you log in, your log in credentials will be saved - this means you don't have to type in ID/password every time you open this player.  
   You can use player even if not logged in, but you can't view/participate chats while you're not logged in(Check 'Limits' part of this README).
2. You can get into the stream by clicking '+' button below. Type in your streamer's ID to get to the stream.

### Shortcuts

- Chats
  - Enter: Send chat
  - Ctrl(Cmd) + Enter: Append line on writing chat

### 2FA(Two-Factor Authorization, also knwon as OTP)

- This program supports 2FA login. Just enter verification numbers as you login on twitch website, and then restart the program once you have completed your log in procedure.

### 한국어

1. 위의 로그인 버튼을 이용해 로그인하세요. 로그인하지 않아도, 방송은 볼 수 있지만, 채팅을 보거나 채팅에 참여할 수 없습니다. 한번 로그인하고 나면, 자동으로 로그인됩니다.
2. 밑의 + 버튼을 이용해 스트리머 채널로 이동하세요.
3. [yeokka](https://twitch.tv/yeokka) 채널 및 [funzinnu](https://twitch.tv/funzinnu)에서는 '디씨콘' 이 이미지로 치환되어 보입니다.

### Chatroom Themes

- You can apply BridgeBBCC compatible CSS chatroom theme by typing `!!theme <CSS URL>` on chat send area.
- Revert to default preset by `!!theme default` .
- Keyword `default` can't be used as a preset name, since it's a reserved word.

#### 한국어

- BridgeBBCC 호환 채팅 테마를 적용할 수 있습니다. 채팅창에 `!!theme <CSS URL>` 을 입력하세요.
- `!!theme default` 로 기본 테마로 돌아갈 수 있습니다.

## TO-DOs

- Add DC-con picker.
