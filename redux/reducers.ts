import { Reducer, combineReducers } from 'redux'
import { ChatState, ActionTypes, AuthState } from '../constants'

export const chatReducer: Reducer<ChatState> = (
  state: ChatState = {
    streamerName: '',
    streamer: '',
  },
  action
): ChatState => {
  switch (action.type) {
    case ActionTypes.SET_STREAMER:
      return { ...state, streamer: action.setTo }
    case ActionTypes.SET_STREAMER_NAME:
      return { ...state, streamerName: action.setTo }
    default:
      return state
  }
}

export const authReducer: Reducer<AuthState> = (
  state: AuthState = {
    username: '',
    password: '',
    refreshToken: '',
  },
  action
): AuthState => {
  switch (action.type) {
    case ActionTypes.SET_AUTH_INFO:
      return { ...state, ...action.setTo }
    default:
      return state
  }
}

export const Reducers = combineReducers({ chatReducer, authReducer })
