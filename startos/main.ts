import { readFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { daemons } from '@start9labs/start-sdk'
import { socksHostId, socksPort } from 'tor-startos/startos/utils'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { config } from './fileModels/config'
import { store } from './fileModels/store.json'
import {
  announcementMetadata,
  announcementUrl,
  helperCommand,
  profile,
  hasReceivingAccount,
} from './utils'
import { addRegtestNode } from './lab'

export const main = sdk.setupMain(async ({ effects }) => {
  const useTor = await store.read((s) => s.useTor).const(effects)
  const bitcoin = '127.0.0.1:18443'
  const tor = useTor
    ? await sdk.host
        .getBridgeAddress(effects, {
          packageId: 'tor',
          hostId: socksHostId,
          internalPort: socksPort,
        })
        .const()
    : null
  const account = await config
    .read((c) => c.CoordinatorExtPubKey)
    .const(effects)
  if ((useTor && !tor) || !hasReceivingAccount(account)) {
    const message = !hasReceivingAccount(account)
      ? i18n('Set the receiving account before starting.')
      : i18n('Tor is unavailable.')
    return sdk.Daemons.of(effects).addHealthCheck('coordinator', {
      ready: {
        display: i18n('Coordinator'),
        fn: () => ({
          result: 'waiting',
          message,
        }),
      },
      requires: [],
    })
  }
  const sub = sdk.SubContainer.of(
    effects,
    { imageId: 'coordinator' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: '/data',
        readonly: false,
      })
      .mountVolume({
        volumeId: 'startos',
        subpath: 'announcement',
        mountpoint: '/startos',
        readonly: false,
      })
      .mountVolume({
        volumeId: 'bitcoin',
        subpath: null,
        mountpoint: '/mnt/bitcoin',
        readonly: true,
      }),
    'coordinator-sub',
  )
  const torProxy = tor ? `socks5://${tor}` : null
  const env = {
    BITCOIN_RPC: `http://${bitcoin}`,
    BITCOIN_COOKIE: profile.cookiePath,
    BITCOIN_CHAIN: profile.chain,
    DISCOVERY_NETWORK: profile.discoveryNetwork,
    USE_TOR: useTor ? 'true' : 'false',
    ...(torProxy ? { TOR_PROXY: torProxy } : {}),
    'Logging__LogLevel__Microsoft.AspNetCore.DataProtection': 'Error',
  }
  await config.merge(effects, {
    [profile.rpcConfigKey]: env.BITCOIN_RPC,
    BitcoinRpcConnectionString: `cookiefile=${env.BITCOIN_COOKIE}`,
    PublishAsOnionService: false,
    AnnouncerConfig: { IsEnabled: false },
  })
  const probe = async (mode: string, success: string, failure: string) => {
    try {
      await sub.execFail([...helperCommand, mode], { env, timeout: 20000 })
      return { result: 'success' as const, message: success }
    } catch {
      return { result: 'failure' as const, message: failure }
    }
  }
  return sdk.Daemons.dynamic(effects, async ({ effects: discoveryEffects }) => {
    const discovery = await store
      .read((s) => s.discoveryEnabled)
      .const(discoveryEffects)
    const url = discovery ? await announcementUrl.const(discoveryEffects) : null
    const settings =
      discovery && url
        ? await store.read((s) => s.announcement).const(discoveryEffects)
        : null
    const announcement = settings
      ? {
          ...settings,
          Key:
            (await config
              .read((c) => c.AnnouncerConfig.Key)
              .const(discoveryEffects)) ?? '',
        }
      : null
    const chain = addRegtestNode(effects, sdk.Daemons.of(discoveryEffects))
      .addOneshot('bitcoin-ready', {
        subcontainer: sub,
        exec: { command: [...helperCommand, 'check-bitcoin'], env },
        requires: [],
      })
      .addOneshot('tor-ready', () =>
        useTor
          ? {
              subcontainer: sub,
              exec: { command: [...helperCommand, 'check-tor'], env },
              requires: [],
            }
          : null,
      )
      .addHealthCheck('bitcoin', {
        ready: {
          display: i18n('Bitcoin'),
          fn: () =>
            probe(
              'check-bitcoin',
              i18n('Bitcoin is synchronized on the correct network.'),
              i18n(
                'Bitcoin is unavailable, still synchronizing, or on the wrong network.',
              ),
            ),
        },
        requires: ['prepare-lab'],
      })
      .addHealthCheck('tor', () =>
        useTor
          ? {
              ready: {
                display: 'Tor',
                fn: () =>
                  probe(
                    'check-tor',
                    i18n('Tor is available.'),
                    i18n('Tor is unavailable.'),
                  ),
              },
              requires: [],
            }
          : null,
      )
      .addDaemon('coordinator', {
        subcontainer: sub,
        exec: {
          command: [
            '/opt/coordinator/wcoordinator',
            '--datadir=/data',
            '--urls=http://0.0.0.0:37126',
          ],
          cwd: '/opt/coordinator',
          env: {
            ...env,
            ...(torProxy
              ? {
                  HTTP_PROXY: torProxy,
                  HTTPS_PROXY: torProxy,
                  ALL_PROXY: torProxy,
                  NO_PROXY: `${new URL(env.BITCOIN_RPC).hostname},127.0.0.1,localhost`,
                }
              : {}),
          },
          sigtermTimeout: 60000,
        },
        ready: {
          display: i18n('Coordinator'),
          gracePeriod: 60000,
          fn: () =>
            probe(
              'check-coordinator',
              i18n('Coordinator is ready.'),
              i18n('No active round is available. Check the service logs.'),
            ),
        },
        requires: useTor ? ['bitcoin-ready', 'tor-ready'] : ['bitcoin-ready'],
      })
    if (!discovery || !url || !announcement)
      return chain.addHealthCheck('discovery', {
        ready: {
          display: i18n('Nostr Discovery'),
          fn: async () => ({
            result: 'disabled',
            message: (await store.read((s) => s.discoveryEnabled).once())
              ? i18n(
                  'Select an enabled public announcement address to resume discovery.',
                )
              : i18n('Nostr announcements are turned off.'),
          }),
        },
        requires: [],
      })
    const metadata = announcementMetadata(announcement, url)
    return chain.addDaemon('discovery', {
      // The coordinator owns the container; discovery owns only its process.
      subcontainer: null,
      exec: {
        fn: async (_, signal) => {
          const command = await daemons.runCommand<typeof sdk.manifest>()(
            effects,
            sub,
            {
              command: [...helperCommand, 'announce'],
              env: {
                ...env,
                ANNOUNCEMENT_URL: url,
                ANNOUNCEMENT_CONFIG: JSON.stringify(settings),
              },
              sigtermTimeout: 5000,
            },
          )
          const stopPublisher = () => {
            void command.term().catch(() => {})
          }
          signal.addEventListener('abort', stopPublisher, { once: true })
          try {
            if (signal.aborted) stopPublisher()
            await command.wait()
            return null
          } finally {
            signal.removeEventListener('abort', stopPublisher)
            await command.term().catch(() => {})
          }
        },
        sigtermTimeout: 5000,
      },
      uses: metadata,
      ready: {
        display: i18n('Nostr Discovery'),
        gracePeriod: 60000,
        fn: async () => {
          try {
            const status = JSON.parse(
              await readFile(
                sdk.volumes.startos.subpath(
                  'announcement/announcement-status.json',
                ),
                'utf8',
              ),
            ) as { lastSuccess: number; eventId: string; metadata: unknown }
            const age = Date.now() / 1000 - status.lastSuccess
            if (
              Number.isFinite(status.lastSuccess) &&
              age >= 0 &&
              age < 1800 &&
              typeof status.eventId === 'string' &&
              /^[0-9a-f]{64}$/.test(status.eventId) &&
              isDeepStrictEqual(status.metadata, metadata)
            )
              return {
                result: 'success',
                message: i18n('Announcement published.'),
              }
          } catch {
            /* No matching successful announcement yet. */
          }
          return {
            result: 'failure',
            message: i18n(
              'No relay accepted the announcement. Check the address and relays.',
            ),
          }
        },
      },
      requires: useTor
        ? ['coordinator', 'bitcoin', 'tor']
        : ['coordinator', 'bitcoin'],
    })
  })
})
