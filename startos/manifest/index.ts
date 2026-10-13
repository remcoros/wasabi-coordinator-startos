import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'wasabi-coordinator-regtest',
  title: 'Wasabi Coordinator Regtest',
  license: 'MIT',
  packageRepo: 'https://github.com/remcoros/wasabi-coordinator-startos',
  upstreamRepo: 'https://github.com/WalletWasabi/WalletWasabi',
  marketingUrl: 'https://wasabiwallet.io/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'startos', 'bitcoin'],
  images: {
    coordinator: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
    bitcoind: {
      source: {
        dockerBuild: {
          workdir: 'node_modules/bitcoin-core-startos',
          buildArgs: { VERSION: '31.1' },
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
    runner: {
      source: { dockerBuild: { dockerfile: 'Dockerfile.runner' } },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
