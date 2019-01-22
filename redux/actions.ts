import { action } from 'typesafe-actions'
import { ChatState, AuthState, ActionTypes } from '../constants'

export const setStreamer = (chatObj: string) =>
  action(ActionTypes.SET_STREAMER, chatObj)

export const setAuth = (authObj: AuthState) =>
  action(ActionTypes.SET_AUTH_INFO, authObj)

export const setStreamerName = (name: string) =>
  action(ActionTypes.SET_STREAMER_NAME, name)
