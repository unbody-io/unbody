export class PluginEvent<N, T> {
  name: N
  payload: T
  idempotencyKey?: string

  constructor(name: N, payload: T, idempotencyKey?: string) {
    this.name = name
    this.payload = payload
    this.idempotencyKey = idempotencyKey
  }
}
