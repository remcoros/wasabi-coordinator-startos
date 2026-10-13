import { sdk } from '../sdk'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { seed, receivingTask, discoveryTask } from './setup'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  setInterfaces,
  actions,
  dependencies,
  seed,
  receivingTask,
  discoveryTask,
)

export const uninit = sdk.setupUninit(versionGraph)
