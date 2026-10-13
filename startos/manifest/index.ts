import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'wasabi-coordinator',
  title: 'Wasabi Coordinator',
  license: 'MIT',
  packageRepo: 'https://github.com/remcoros/wasabi-coordinator-startos',
  upstreamRepo: 'https://github.com/WalletWasabi/WalletWasabi',
  marketingUrl: 'https://wasabiwallet.io/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'startos'],
  images: {
    coordinator: { source: { dockerBuild: {} }, arch: ['x86_64', 'aarch64'] },
  },
})
