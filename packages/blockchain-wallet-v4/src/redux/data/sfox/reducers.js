import { assoc } from 'ramda'
import * as AT from './actionTypes.js'
import Remote from '../../../remote'

const INITIAL_STATE = {
  quote: Remote.NotAsked,
  trades: Remote.NotAsked,
  profile: Remote.NotAsked,
  accounts: Remote.NotAsked,
  nextAddress: null
}

const sfoxReducer = (state = INITIAL_STATE, action) => {
  const { type, payload } = action

  switch (type) {
    case AT.FETCH_PROFILE_LOADING: {
      return assoc('profile', Remote.Loading, state)
    }
    case AT.FETCH_PROFILE_SUCCESS: {
      return assoc('profile', Remote.Success(payload), state)
    }
    case AT.FETCH_PROFILE_FAILURE: {
      return assoc('profile', Remote.Failure(payload), state)
    }
    case AT.FETCH_QUOTE_LOADING: {
      return assoc('quote', Remote.Loading, state)
    }
    case AT.FETCH_QUOTE_SUCCESS: {
      return assoc('quote', Remote.Success(payload), state)
    }
    case AT.FETCH_QUOTE_FAILURE: {
      return assoc('quote', Remote.Failure(payload), state)
    }
    case AT.FETCH_ACCOUNTS_LOADING: {
      return assoc('accounts', Remote.Loading, state)
    }
    case AT.FETCH_ACCOUNTS_SUCCESS: {
      return assoc('accounts', Remote.Success(payload), state)
    }
    case AT.FETCH_ACCOUNTS_FAILURE: {
      return assoc('accounts', Remote.Failure(payload), state)
    }
    case AT.HANDLE_TRADE_LOADING: {
      return assoc('trade', Remote.Loading, state)
    }
    case AT.HANDLE_TRADE_SUCCESS: {
      return assoc('trade', Remote.Success(payload), state)
    }
    case AT.HANDLE_TRADE_FAILURE: {
      return assoc('trade', Remote.Failure(payload), state)
    }
    case AT.SET_PROFILE_SUCCESS: {
      return assoc('profile', Remote.Success(payload), state)
    }
    case AT.SET_PROFILE_FAILURE: {
      return assoc('profile', Remote.Failure(payload), state)
    }
    case AT.SET_NEXT_ADDRESS: {
      return assoc('nextAddress', payload, state)
    }
    default:
      return state
  }
}

export default sfoxReducer
