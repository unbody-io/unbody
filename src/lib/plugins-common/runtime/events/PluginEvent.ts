export class PluginEvent<N, T> {
  name: N
  payload: T

  constructor(name: N, payload: T) {
    this.name = name
    this.payload = payload
  }
}
