import { sdk } from './sdk'
import { i18n } from './i18n'
import { profile } from './utils'
import { store } from './fileModels/store.json'

export const dependencies = sdk.Dependencies.of()
  .addDependency(
    sdk.Dependency.required(profile.bitcoinId, {
      description: i18n(
        'Provides blockchain data, fee estimates, and transaction broadcast.',
      ),
      metadata: {
        title: 'Bitcoin',
        icon: 'https://raw.githubusercontent.com/remcoros/bitcoind-testnet4-startos/31.x-testnet4/icon.svg',
      },
      versionRange: '>=31.1:0',
      kind: 'running',
      healthChecks: ['bitcoind'],
    }),
  )
  .addDependency(
    sdk.Dependency.optional('tor', {
      description: i18n('Routes public fee requests and Nostr announcements.'),
      metadata: {
        title: 'Tor',
        icon: 'https://raw.githubusercontent.com/Start9Labs/tor-startos/next/icon.svg',
      },
      versionRange: '>=0.4.9.12:5',
      kind: 'running',
      healthChecks: ['tor'],
      enabled: async () => (await store.read((s) => s.useTor).once()) ?? true,
    }),
  )
