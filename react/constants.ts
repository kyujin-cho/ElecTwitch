export type ChatState = {
  readonly streamerName: string
  readonly streamer: string
}

export type AuthState = {
  readonly username: string
  readonly accessToken: string
  readonly refreshToken: string
  readonly expiresIn: number
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

export type MyStreamsType = {
  login: string
  game: string
  game_id: string
  display_name: string
  thumbnail_url: string
  title: string
}
