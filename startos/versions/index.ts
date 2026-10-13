import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v_2_8_3_1 } from './v2.8.3_1'
import { v_2_8_3_2 } from './v2.8.3_2'

export const versionGraph = VersionGraph.of({
  current,
  other: [v_2_8_3_1, v_2_8_3_2],
})
