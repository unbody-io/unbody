import { UnbodyProjectSettingsDoc } from 'src/lib/core-types'
import { Collections } from './Collections'

export class ProjectContext {
  public collections: Collections

  constructor(public settings: UnbodyProjectSettingsDoc) {
    this.collections = new Collections(this.settings)
  }
}
