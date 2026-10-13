import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { T } from '@start9labs/start-sdk'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { I18nKey } from './i18n/dictionaries/default'
import { profile } from './utils'

export const runnerCommand: [string, ...string[]] = [
  'dotnet',
  '/opt/regtest/RegtestRunner.dll',
]
export const runnerEnv = {
  BITCOIN_RPC: 'http://127.0.0.1:18443',
  BITCOIN_COOKIE: profile.cookiePath,
  COORDINATOR_URL: 'http://127.0.0.1:37126',
}
export const runnerMounts = () =>
  sdk.Mounts.of()
    .mountVolume({
      volumeId: 'bitcoin',
      subpath: null,
      mountpoint: '/mnt/bitcoin',
      readonly: true,
    })
    .mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: true,
    })
    .mountVolume({
      volumeId: 'startos',
      subpath: null,
      mountpoint: '/startos',
      readonly: false,
    })

export function regtestScenario(id: string, name: I18nKey, mode: string) {
  return sdk.Action.withoutInput(
    id,
    {
      name: i18n(name),
      description: i18n("Uses only the package's private regtest node."),
      warning: null,
      allowedStatuses: 'only-running',
      group: i18n('5. RegTest Tests'),
      visibility: 'enabled',
    },
    async ({ effects }) =>
      sdk.SubContainer.withTemp(
        effects,
        { imageId: 'runner' },
        runnerMounts(),
        'regtest-test-sub',
        async (sub) => {
          const runId = randomUUID()
          const result = await sub.exec([...runnerCommand, mode], {
            env: { ...runnerEnv, RUN_ID: runId },
            timeout: 660000,
          })
          const report = await readFile(
            sdk.volumes.startos.subpath('reports/' + runId + '.json'),
            'utf8',
          ).catch(() =>
            JSON.stringify({
              passed: false,
              exitCode: result.exitCode,
              timedOutAfter: result.timedOutAfter,
            }),
          )
          return {
            version: '1',
            title: i18n('Regtest Test Result'),
            message: i18n('Only disposable regtest coins were used.'),
            result: {
              type: 'multiline',
              value: report,
              copyable: true,
              masked: false,
              qr: false,
              filename: 'regtest-report.json',
            },
          }
        },
      ),
  )
}

export function addRegtestNode(
  effects: T.Effects,
  chain: ReturnType<typeof sdk.Daemons.of>,
) {
  const node = sdk.SubContainer.of(
    effects,
    { imageId: 'bitcoind' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'bitcoin',
      subpath: null,
      mountpoint: '/bitcoin',
      readonly: false,
    }),
    'regtest-node-sub',
  )
  return chain
    .addDaemon('regtest-node', {
      subcontainer: node,
      exec: {
        command: [
          'bitcoind',
          '-datadir=/bitcoin',
          '-regtest=1',
          '-server=1',
          '-rpcport=18443',
          '-rpcbind=127.0.0.1',
          '-rpcallowip=127.0.0.1',
          '-listen=0',
          '-discover=0',
          '-dnsseed=0',
          '-fixedseeds=0',
          '-txindex=1',
          '-fallbackfee=0.0002',
          '-persistmempool=0',
        ],
        sigtermTimeout: 60000,
      },
      ready: {
        display: i18n('Regtest Node'),
        fn: async () => {
          try {
            const result = await node.execFail([
              'bitcoin-cli',
              '-datadir=/bitcoin',
              '-regtest',
              'getblockchaininfo',
            ])
            return JSON.parse(result.stdout.toString()).chain === 'regtest'
              ? {
                  result: 'success',
                  message: i18n('The regtest node is ready.'),
                }
              : {
                  result: 'failure',
                  message: i18n('The node is not on regtest.'),
                }
          } catch {
            return {
              result: 'waiting',
              message: i18n('Waiting for the regtest node.'),
            }
          }
        },
      },
      requires: [],
    })
    .addOneshot('prepare-lab', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: 'runner' },
        runnerMounts(),
        'regtest-prepare-sub',
      ),
      exec: { command: [...runnerCommand, 'prepare'], env: runnerEnv },
      requires: ['regtest-node'],
    })
}
