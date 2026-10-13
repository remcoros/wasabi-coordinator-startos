import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const announcementShape = z.looseObject({
  CoordinatorName: z.string().catch('Coordinator'),
  CoordinatorDescription: z.string().catch('WabiSabi Coinjoin Coordinator'),
  AbsoluteMinInputCount: z.number().catch(21),
  ReadMoreUri: z.string().catch(''),
  RelayUris: z.array(z.string()).catch(['wss://relay.primal.net']),
})

export const store = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  z.looseObject({
    useTor: z.boolean().catch(false),
    discoveryEnabled: z.boolean().catch(false),
    primaryUrl: z.string().nullable().catch(null),
    announcement: announcementShape.nullable().catch(null),
  }),
)
