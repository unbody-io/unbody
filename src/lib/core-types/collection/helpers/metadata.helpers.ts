export const getMetadataObject = <T = any>(
  target: any,
  propertyKey?: string,
): T =>
  Object.fromEntries(
    (propertyKey
      ? Reflect.getOwnMetadataKeys(target, propertyKey)
      : Reflect.getOwnMetadataKeys(target)
    ).map((key) => [
      key,
      propertyKey
        ? Reflect.getOwnMetadata(key, target, propertyKey)
        : Reflect.getOwnMetadata(key, target),
    ]),
  ) as T
