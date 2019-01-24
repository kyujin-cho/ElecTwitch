import { Reducer, combineReducers } from 'redux'
import { ActionTypes, AuthState } from '../constants'

export const authReducer: Reducer<AuthState> = (
  state: AuthState = {
    username: 'justinfan' + Math.floor(Math.random() * 100000),
    accessToken: '',
    refreshToken: '',
    expiresIn: 0,
  },
  action
): AuthState => {
  console.log(action)
  switch (action.type) {
    case ActionTypes.SET_AUTH_INFO:
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export const Reducers = combineReducers({ authReducer })
