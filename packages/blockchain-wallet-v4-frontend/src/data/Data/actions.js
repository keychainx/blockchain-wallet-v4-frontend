import * as AT from './actionTypes'

export const getAdverts = (number) => ({ type: AT.GET_ADVERTS, payload: { number } })

export const getCaptcha = () => ({ type: AT.GET_CAPTCHA })

export const getPriceIndexSeries = (coin, currency, start, scale) => ({ type: AT.GET_PRICE_INDEX_SERIES, payload: { coin, currency, start, scale } })

export const getLogs = () => ({ type: AT.GET_LOGS })

export const getTransactions = (address) => ({ type: AT.GET_TRANSACTIONS, payload: { address } })

export const getTransactionFiatAtTime = (coin, hash, amount, time) => ({ type: AT.GET_TRANSACTION_FIAT_AT_TIME, payload: { coin, hash, amount, time } })