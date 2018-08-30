import { selectors, model } from 'data'
import {
  compose,
  contains,
  cond,
  curry,
  equals,
  filter,
  flip,
  head,
  indexOf,
  last,
  length,
  lift,
  map,
  path,
  prop,
  propEq,
  split,
  sortBy,
  uniq,
  unnest
} from 'ramda'
import { createDeepEqualSelector } from 'services/ReselectHelper'
import { currencySymbolMap } from 'services/CoinifyService'
import { Remote } from 'blockchain-wallet-v4'

const { EXCHANGE_FORM, formatPair } = model.components.exchange
const { getComplementaryField, mapFixToFieldName, FIX_TYPES } = model.rates
const { BASE, BASE_IN_FIAT, COUNTER, COUNTER_IN_FIAT } = FIX_TYPES

const currenciesOrder = ['BTC', 'BCH', 'ETH']

const getAvailableCurrencies = chooseCurrency =>
  compose(
    sortBy(flip(indexOf)(currenciesOrder)),
    uniq,
    map(
      compose(
        chooseCurrency,
        split('-')
      )
    )
  )
const getFromCurrencies = getAvailableCurrencies(head)
const getToCurrencies = getAvailableCurrencies(last)

const getBtcGroup = btcAccounts => ({
  label: 'Bitcoin',
  options: btcAccounts.map(formatGroup)
})
const getBchGroup = bchAccounts => ({
  label: 'Bitcoin Cash',
  options: bchAccounts.map(formatGroup)
})
const getEthGroup = ethAccounts => ({
  label: 'Ether',
  options: ethAccounts.map(formatGroup)
})

export const format = acc => ({ text: prop('label', acc), value: acc })
export const formatGroup = acc => ({ label: prop('label', acc), value: acc })

export const formatDefault = curry((coin, acc) => ({ text: coin, value: acc }))

export const generateGroups = (
  bchAccounts,
  btcAccounts,
  ethAccounts,
  hasOneAccount
) => availableCurrencies => {
  if (hasOneAccount) {
    const accounts = availableCurrencies.map(
      cond([
        [equals('BTC'), () => btcAccounts.map(formatDefault('Bitcoin'))],
        [equals('BCH'), () => bchAccounts.map(formatDefault('Bitcoin Cash'))],
        [equals('ETH'), () => ethAccounts.map(formatDefault('Ether'))]
      ])
    )
    return [
      {
        group: '',
        items: unnest(accounts)
      }
    ]
  }

  return availableCurrencies.map(
    cond([
      [equals('BTC'), () => getBtcGroup(btcAccounts)],
      [equals('BCH'), () => getBchGroup(bchAccounts)],
      [equals('ETH'), () => getEthGroup(ethAccounts)]
    ])
  )
}

const getBchAccounts = createDeepEqualSelector(
  [
    selectors.core.wallet.getHDAccounts,
    selectors.core.data.bch.getAddresses,
    selectors.core.kvStore.bch.getAccounts
  ],
  (bchAccounts, bchDataR, bchMetadataR) => {
    const transform = (bchData, bchMetadata) =>
      bchAccounts.map(acc => {
        const index = prop('index', acc)
        const data = prop(prop('xpub', acc), bchData)
        const metadata = bchMetadata[index]

        return {
          archived: prop('archived', metadata),
          coin: 'BCH',
          label: prop('label', metadata) || prop('xpub', acc),
          address: index,
          balance: prop('final_balance', data)
        }
      })

    return lift(transform)(bchDataR, bchMetadataR)
  }
)

const getBtcAccounts = createDeepEqualSelector(
  [
    selectors.core.wallet.getHDAccounts,
    selectors.core.data.bitcoin.getAddresses
  ],
  (btcAccounts, btcDataR) => {
    const transform = btcData => {
      return btcAccounts.map(acc => ({
        archived: prop('archived', acc),
        coin: 'BTC',
        label: prop('label', acc) || prop('xpub', acc),
        address: prop('index', acc),
        balance: prop('final_balance', prop(prop('xpub', acc), btcData))
      }))
    }

    return lift(transform)(btcDataR)
  }
)

const getEthAccounts = createDeepEqualSelector(
  [
    selectors.core.data.ethereum.getAddresses,
    selectors.core.kvStore.ethereum.getAccounts
  ],
  (ethDataR, ethMetadataR) => {
    const transform = (ethData, ethMetadata) =>
      ethMetadata.map(acc => {
        const data = prop(prop('addr', acc), ethData)

        return {
          archived: prop('archived', acc),
          coin: 'ETH',
          label: prop('label', acc) || prop('addr', acc),
          address: prop('addr', acc),
          balance: prop('balance', data)
        }
      })

    return lift(transform)(ethDataR, ethMetadataR)
  }
)

const getFormValues = state => {
  const formValues = selectors.form.getFormValues(EXCHANGE_FORM)(state)
  return {
    sourceCoin: path(['source', 'coin'], formValues) || 'BTC',
    targetCoin: path(['target', 'coin'], formValues) || 'ETH',
    fix: prop('fix', formValues) || BASE_IN_FIAT
  }
}

const getCurrentPair = state => {
  const { sourceCoin, targetCoin } = getFormValues(state)
  return formatPair(sourceCoin, targetCoin)
}
const getCurrentPairAmounts = state =>
  selectors.components.exchange.getAmounts(getCurrentPair(state), state)
const getCurrentPairRates = state =>
  selectors.components.exchange.getRates(getCurrentPair(state), state)

export const getData = createDeepEqualSelector(
  [
    getBtcAccounts,
    getBchAccounts,
    getEthAccounts,
    selectors.core.settings.getCurrency,
    selectors.components.exchange.getError,
    getFormValues,
    selectors.modules.rates.getAvailablePairs,
    getCurrentPairAmounts,
    getCurrentPairRates
  ],
  (
    btcAccountsR,
    bchAccountsR,
    ethAccountsR,
    currencyR,
    formError,
    formValues,
    availablePairsR,
    amountsR,
    ratesR
  ) => {
    const { sourceCoin, targetCoin, fix } = formValues
    const sourceActive = contains(fix, [BASE, BASE_IN_FIAT])
    const targetActive = contains(fix, [COUNTER, COUNTER_IN_FIAT])
    const coinActive = contains(fix, [BASE, COUNTER])
    const fiatActive = contains(fix, [BASE_IN_FIAT, COUNTER_IN_FIAT])

    const transform = (
      btcAccounts,
      bchAccounts,
      ethAccounts,
      currency,
      availablePairs
    ) => {
      const isActive = propEq('archived', false)
      const activeBtcAccounts = filter(isActive, btcAccounts)
      const activeBchAccounts = filter(isActive, bchAccounts)
      const activeEthAccounts = filter(isActive, ethAccounts)
      const defaultBtcAccount = head(activeBtcAccounts)
      const defaultEthAccount = head(activeEthAccounts)
      const hasOneAccount = length(activeBtcAccounts) === 1
      const generateActiveGroups = generateGroups(
        activeBchAccounts,
        activeBtcAccounts,
        activeEthAccounts,
        hasOneAccount
      )
      const fromElements = generateActiveGroups(
        getFromCurrencies(availablePairs)
      )
      const toElements = generateActiveGroups(getToCurrencies(availablePairs))
      const initialValues = {
        source: defaultBtcAccount,
        target: defaultEthAccount,
        sourceFiat: 0,
        fix: BASE_IN_FIAT
      }
      const inputField = mapFixToFieldName(fix)
      const complementaryField = getComplementaryField(inputField)
      const fieldCoins = {
        sourceAmount: sourceCoin,
        sourceFiat: currency,
        targetAmount: targetCoin,
        targetFiat: currency
      }
      const inputCurrency = prop(inputField, fieldCoins)
      const complementaryCurrency = prop(complementaryField, fieldCoins)

      return {
        availablePairs,
        fromElements,
        toElements,
        initialValues,
        hasOneAccount,
        disabled: !Remote.Success.is(amountsR),
        formError,
        currency,
        inputField,
        inputSymbol: currencySymbolMap[inputCurrency],
        complementaryAmount: amountsR.map(prop(complementaryField)),
        complementarySymbol: currencySymbolMap[complementaryCurrency],
        sourceAmount: amountsR.map(prop('sourceAmount')),
        targetAmount: amountsR.map(prop('targetAmount')),
        targetFiat: amountsR.map(prop('targetFiat')),
        sourceToTargetRate: ratesR.map(prop('sourceToTargetRate')),
        sourceToFiatRate: ratesR.map(prop('sourceToFiatRate')),
        targetToFiateRate: ratesR.map(prop('targetToFiateRate')),
        sourceCoin,
        targetCoin,
        sourceActive,
        targetActive,
        coinActive,
        fiatActive,
        fix
      }
    }
    return lift(transform)(
      btcAccountsR,
      bchAccountsR,
      ethAccountsR,
      currencyR,
      availablePairsR
    )
  }
)