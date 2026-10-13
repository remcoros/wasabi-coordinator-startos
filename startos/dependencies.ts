import { sdk } from './sdk'
import { i18n } from './i18n'
import { store } from './fileModels/store.json'

export const dependencies = sdk.Dependencies.of().addDependency(
  sdk.Dependency.optional('tor', {
    description: i18n('Routes public fee requests and Nostr announcements.'),
    metadata: {
      title: 'Tor',
      icon: 'https://raw.githubusercontent.com/Start9Labs/tor-startos/next/icon.svg',
    },
    versionRange: '>=0.4.9.12:5',
    kind: 'running',
    healthChecks: ['tor'],
    enabled: async () => (await store.read((s) => s.useTor).once()) ?? false,
  }),
)
