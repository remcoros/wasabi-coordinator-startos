import { HDKey } from '@scure/bip32'
import { createHash } from 'node:crypto'
import { base58check, bech32 } from '@scure/base'
import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import { T } from '@start9labs/start-sdk'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { I18nKey } from './i18n/dictionaries/default'
import { store } from './fileModels/store.json'

export const announcementAddresses = (effects: T.Effects) =>
  sdk.host.getOwn(effects, 'coordinator', (host) => {
    const binding = Object.values(host?.bindings ?? {}).find(
      (b) => b.interfaces.coordinator,
    )
    const address = binding?.interfaces.coordinator.addressInfo.nonLocal.public
    return address ? address.format('hostname-info').map(address.toUrl) : []
  })

const selected = (stored: string | null | undefined, urls: string[]) =>
  stored && urls.includes(stored) ? stored : null

// The chosen announcement address, or null while it is unset or no longer an enabled public address.
export const announcementUrl = {
  once: async (effects: T.Effects) =>
    selected(
      await store.read((s) => s.primaryUrl).once(),
      await announcementAddresses(effects).once(),
    ),
  const: async (effects: T.Effects) =>
    selected(
      await store.read((s) => s.primaryUrl).const(effects),
      await announcementAddresses(effects).const(),
    ),
}

export const profile = {
  network: 'RegTest',
  chain: 'regtest',
  discoveryNetwork: 'regtest',
  addressPrefix: 'bcrt',
  keyVersions: [0x043587cf, 0x045f1cf6], // tpub, vpub
  bitcoinId: 'wasabi-coordinator-regtest',
  rpcConfigKey: 'RegTestBitcoinRpcUri',
  rpcHostId: 'regtest',
  rpcPort: 18443,
  cookiePath: '/mnt/bitcoin/regtest/.cookie',
} as const
export const coordinatorPort = 37126
export const helperCommand: [string, ...string[]] = [
  'dotnet',
  '/opt/coordinator/StartOsHelper.dll',
]

export const stopped = (
  name: I18nKey,
  description: I18nKey,
  group: I18nKey,
) => ({
  name: i18n(name),
  description: i18n(description),
  warning: null,
  allowedStatuses: 'only-stopped' as const,
  group: i18n(group),
  visibility: 'enabled' as const,
})

export const saved = (): T.ActionResult & { version: '1' } => ({
  version: '1',
  title: i18n('Settings Saved'),
  message: i18n('Start the service to use these settings.'),
  result: null,
})

export const number = (
  name: I18nKey,
  value: number,
  min: number,
  max: number,
  units: string | null = null,
  integer = true,
  description: I18nKey | null = null,
) =>
  sdk.Value.number({
    name: i18n(name),
    description: description ? i18n(description) : null,
    default: value,
    required: true,
    min,
    max,
    units,
    integer,
  })

export const text = (
  name: I18nKey,
  description: I18nKey,
  required: boolean,
  value: string | null = null,
) =>
  sdk.Value.text({
    name: i18n(name),
    description: i18n(description),
    default: value,
    required,
  })

export function effectiveReadMore(value: string, endpoint: string): string {
  // Keep the explicit blank set identical to EffectiveReadMore in docker/helper.
  return /^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$/u.test(
    value,
  )
    ? endpoint
    : value
}

export function announcementMetadata(
  announcement: {
    CoordinatorName: string
    CoordinatorDescription: string
    AbsoluteMinInputCount: number
    ReadMoreUri: string
    RelayUris: string[]
    Key: string
  },
  endpoint: string,
) {
  return {
    network: profile.discoveryNetwork,
    endpoint,
    name: announcement.CoordinatorName,
    description: announcement.CoordinatorDescription,
    minimumInputs: announcement.AbsoluteMinInputCount,
    readMore: effectiveReadMore(announcement.ReadMoreUri, endpoint),
    relays: announcement.RelayUris,
    keyFingerprint: createHash('sha256').update(announcement.Key).digest('hex'),
  }
}

const allKeyVersions = [0x0488b21e, 0x043587cf, 0x04b24746, 0x045f1cf6]

// `entered` keys must match the network; stored keys are already normalized to xpub form.
export function accountKey(
  value: string,
  entered = false,
): {
  xpub: string
  profileKey: string
  address: string
} {
  const codec = base58check(sha256)
  const bytes = codec.decode(value.trim())
  if (bytes.length !== 78) throw new Error('Invalid account public key')
  const version = Buffer.from(bytes.subarray(0, 4)).readUInt32BE()
  const allowed: readonly number[] = entered
    ? profile.keyVersions
    : allKeyVersions
  if (!allowed.includes(version)) throw new Error('Unsupported public key type')
  Buffer.from(bytes.buffer, bytes.byteOffset, 4).writeUInt32BE(0x0488b21e)
  const xpub = codec.encode(bytes)
  const key = HDKey.fromExtendedKey(xpub)
  if (key.privateKey || key.depth !== 3 || key.index < 0x80000000)
    throw new Error('An account public key is required')
  const pub = key.deriveChild(0).deriveChild(1).publicKey!
  const address = bech32.encode(profile.addressPrefix, [
    0,
    ...bech32.toWords(ripemd160(sha256(pub))),
  ])
  Buffer.from(bytes.buffer, bytes.byteOffset, 4).writeUInt32BE(
    profile.keyVersions[0],
  )
  return { xpub, profileKey: codec.encode(bytes), address }
}
export function duration(seconds: number): string {
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`
}

export function hasReceivingAccount(value: string | null): boolean {
  if (!value) return false
  try {
    accountKey(value)
    return true
  } catch {
    return false
  }
}

export function bitcoinAmount(value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value > 21000000) return null
  const fixed = value.toFixed(8)
  return Number(fixed) === value ? fixed : null
}
export function seconds(value: string): number {
  const match = /^(\d+)d (\d+)h (\d+)m (\d+)s$/.exec(value)
  if (!match) throw new Error('Invalid duration')
  return (
    Number(match[1]) * 86400 +
    Number(match[2]) * 3600 +
    Number(match[3]) * 60 +
    Number(match[4])
  )
}
