import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { store } from '../fileModels/store.json'
import { saved, stopped } from '../utils'

export const configureTor = sdk.Action.withInput(
  'configure-tor',
  stopped(
    'Configure Tor',
    'Choose how public fee services and Nostr relays connect.',
    '4. Advanced',
  ),
  sdk.InputSpec.of({
    enabled: sdk.Value.toggle({
      name: i18n('Use Tor for External Connections'),
      description: i18n(
        'When off, public fee services and Nostr relays receive direct connections from this server.',
      ),
      default: false,
    }),
  }),
  async () => ({
    enabled: (await store.read((s) => s.useTor).once()) ?? false,
  }),
  async ({ effects, input }) => {
    await store.merge(effects, { useTor: input.enabled })
    return saved()
  },
)
