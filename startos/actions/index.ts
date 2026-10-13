import { sdk } from '../sdk'
import { configureAddressTypes } from './configureAddressTypes'
import { configureBanPolicy } from './configureBanPolicy'
import { configureDiscovery } from './configureDiscovery'
import { configureMiningFees } from './configureMiningFees'
import { configureOutputPolicy } from './configureOutputPolicy'
import { configureRounds } from './configureRounds'
import { configureRoundTiming } from './configureRoundTiming'
import { configureTor } from './configureTor'
import { setReceivingAccount } from './setReceivingAccount'
import { showWalletConnection } from './showWalletConnection'

export const actions = sdk.Actions.of()
  .addAction(setReceivingAccount)
  .addAction(configureRounds)
  .addAction(configureRoundTiming)
  .addAction(configureMiningFees)
  .addAction(configureAddressTypes)
  .addAction(configureBanPolicy)
  .addAction(configureOutputPolicy)
  .addAction(configureTor)
  .addAction(configureDiscovery)
  .addAction(showWalletConnection)
