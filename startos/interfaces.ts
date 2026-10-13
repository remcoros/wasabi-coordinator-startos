import { sdk } from './sdk'
import { i18n } from './i18n'
import { coordinatorPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const host = sdk.MultiHost.of(effects, 'coordinator')
  const origin = await host.bindPort(coordinatorPort, {
    protocol: 'http',
    addSsl: { preferredExternalPort: 443 },
  })
  const api = sdk.createInterface(effects, {
    id: 'coordinator',
    name: i18n('Coordinator'),
    description: i18n('Connect compatible Wasabi wallets to this coordinator.'),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })
  const monitor = sdk.createInterface(effects, {
    id: 'rounds',
    name: i18n('Round Status'),
    description: i18n('View the current rounds and registered input counts.'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '/wabisabi/human-monitor',
    query: {},
  })
  return [await origin.export([api, monitor])]
})
