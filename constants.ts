export type ChatState = {
  readonly streamerName: string
  readonly streamer: string
}

export type AuthState = {
  readonly username: string
  readonly password: string
  readonly refreshToken: string
}

export type YDCConResponse = {
  readonly dccons: Array<{
    keywords: string[]
    tags: string[]
    path: string
  }>
}

export enum ActionTypes {
  SET_STREAMER = 'SET_CHAT_INFO',
  SET_AUTH_INFO = 'SET_AUTH_INFO',
  SET_STREAMER_NAME = 'SET_STREAMER',
}
