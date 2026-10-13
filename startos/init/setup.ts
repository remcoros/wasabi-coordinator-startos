import { chmod, mkdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { bech32 } from '@scure/base'
import { sdk } from '../sdk'
import { config } from '../fileModels/config'
import { store, announcementShape } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { configureDiscovery } from '../actions/configureDiscovery'
import { setReceivingAccount } from '../actions/setReceivingAccount'
import { announcementUrl, hasReceivingAccount } from '../utils'

export const seed = sdk.setupOnInit(async (effects) => {
  await config.merge(effects, {})
  await store.merge(effects, {})
  if (!(await store.read((s) => s.announcement).once()))
    await store.merge(effects, { announcement: announcementShape.parse({}) })
  const key = await config.read((c) => c.AnnouncerConfig.Key).once()
  if (!key)
    await config.merge(effects, {
      AnnouncerConfig: {
        Key: bech32.encode('nsec', bech32.toWords(randomBytes(32)), 1023),
        IsEnabled: false,
      },
    })
  await chmod(sdk.volumes.main.path, 0o700)
  await chmod(sdk.volumes.startos.path, 0o700)
  // The only part of this volume the coordinator container can write.
  await mkdir(sdk.volumes.startos.subpath('announcement'), { recursive: true })
  await chmod(config.path, 0o600)
  await chmod(store.path, 0o600)
})
export const receivingTask = sdk.setupOnInit(async (effects) => {
  const account = await config
    .read((c) => hasReceivingAccount(c.CoordinatorExtPubKey))
    .const(effects)
  if (!account)
    await sdk.action.createOwnTask(effects, setReceivingAccount, 'critical', {
      reason: i18n(
        'Set the account that receives coordination fees before starting.',
      ),
    })
  else
    await sdk.action.clearTask(
      effects,
      `${sdk.manifest.id}:${setReceivingAccount.id}`,
    )
})
export const discoveryTask = sdk.setupOnInit(async (effects) => {
  const enabled = await store.read((s) => s.discoveryEnabled).const(effects)
  if (enabled && !(await announcementUrl.const(effects)))
    await sdk.action.createOwnTask(effects, configureDiscovery, 'important', {
      reason: i18n('Select an enabled public address for Nostr discovery.'),
    })
  else
    await sdk.action.clearTask(
      effects,
      `${sdk.manifest.id}:${configureDiscovery.id}`,
    )
})
