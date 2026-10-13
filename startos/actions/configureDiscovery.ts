import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { store } from '../fileModels/store.json'
import {
  announcementAddresses,
  announcementUrl,
  number,
  stopped,
  text,
} from '../utils'

const { InputSpec, Value } = sdk

export const configureDiscovery = sdk.Action.withInput(
  'configure-discovery',
  {
    ...stopped(
      'Configure Discovery',
      'Select a public address and configure Nostr announcements.',
      '3. Discovery',
    ),
    allowedStatuses: 'any',
  },
  InputSpec.of({
    url: Value.dynamicSelect<Record<string, string>>(async ({ effects }) => {
      const urls = await announcementAddresses(effects).once()
      return {
        name: i18n('Announcement Address'),
        description: i18n(
          'Enable a public address under Interfaces before selecting it here.',
        ),
        default: 'none',
        values: {
          none: i18n('No Announcement Address'),
          ...Object.fromEntries(urls.map((url) => [url, url])),
        },
      }
    }),
    enabled: Value.toggle({
      name: i18n('Enable Nostr Announcements'),
      description: i18n(
        'Publish the selected address and policy to Nostr relays.',
      ),
      default: false,
    }),
    name: text(
      'Coordinator Name',
      'Name shown in wallet coordinator lists.',
      true,
      'Coordinator',
    ),
    description: text(
      'Description',
      'Description shown in wallet coordinator lists.',
      true,
      'WabiSabi Coinjoin Coordinator',
    ),
    policy: number(
      'Wallet Minimum Inputs',
      21,
      2,
      1000,
      null,
      true,
      "Minimum round size advertised to wallets. This does not change the coordinator's round minimum.",
    ),
    readMore: text(
      'More Information URL',
      'URL shown with the coordinator listing.',
      false,
    ),
    relays: Value.textarea({
      name: i18n('Nostr Relays'),
      description: i18n(
        'Enter one secure relay URL per line, beginning with wss://.',
      ),
      required: true,
      default: 'wss://relay.primal.net',
      minRows: 3,
      maxRows: 10,
    }),
  }),
  async ({ effects }) => {
    const s = await store.read().once()
    const a = s?.announcement
    return a
      ? {
          url: (await announcementUrl.once(effects)) ?? 'none',
          enabled: s?.discoveryEnabled ?? false,
          name: a.CoordinatorName,
          description: a.CoordinatorDescription,
          policy: a.AbsoluteMinInputCount,
          readMore: a.ReadMoreUri || null,
          relays: a.RelayUris.join('\n'),
        }
      : null
  },
  async ({ effects, input }) => {
    const relays = [...new Set(input.relays!.split(/\s+/).filter(Boolean))]
    if (
      relays.length < 1 ||
      relays.length > 10 ||
      relays.some((value) => {
        try {
          const u = new URL(value)
          return u.protocol !== 'wss:' || !!u.username || !!u.password
        } catch {
          return true
        }
      })
    )
      throw new Error(
        i18n('Enter between one and ten valid wss:// relay URLs.'),
      )
    if (input.readMore) {
      try {
        const u = new URL(input.readMore)
        if (
          !['https:', 'http:'].includes(u.protocol) ||
          u.username ||
          u.password
        )
          throw new Error()
      } catch {
        throw new Error(i18n('Enter a valid information page URL.'))
      }
    }
    const url = input.url === 'none' ? null : input.url
    const urls = await announcementAddresses(effects).once()
    if ((url && !urls.includes(url)) || (input.enabled && !url))
      throw new Error(
        i18n('Select an enabled public announcement address first.'),
      )
    await store.merge(effects, {
      discoveryEnabled: input.enabled,
      primaryUrl: url,
      announcement: {
        CoordinatorName: input.name!,
        CoordinatorDescription: input.description!,
        AbsoluteMinInputCount: input.policy,
        ReadMoreUri: input.readMore ?? '',
        RelayUris: relays,
      },
    })
    return {
      version: '1',
      title: i18n('Settings Saved'),
      message: i18n('Discovery settings saved.'),
      result: null,
    }
  },
)
