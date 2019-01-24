import { action } from 'typesafe-actions'
import { AuthState, ActionTypes } from '../constants'

export const setAuth = (authObj: AuthState) =>
  action(ActionTypes.SET_AUTH_INFO, authObj)
