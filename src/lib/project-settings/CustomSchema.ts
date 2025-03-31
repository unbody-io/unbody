const FieldTypes = {
  int: 'int' as 'int',
  number: 'number' as 'number',
  text: 'text' as 'text',
  uuid: 'uuid' as 'uuid',
  date: 'date' as 'date',
  boolean: 'boolean' as 'boolean',
  object: 'object' as 'object',
  phoneNumber: 'phoneNumber' as 'phoneNumber',
  geoCoordinates: 'geoCoordinates' as 'geoCoordinates',
  cref: 'cref' as 'cref',
}

type FieldType = keyof typeof FieldTypes

class FieldBase {
  public name: string = ''
  public type: FieldType = '' as any
  public array: boolean = false
  public description: string = ''
  public skipVectorization: boolean = false
  public tokenization: 'word' | 'field' | 'lowercase' | 'whitespace' | null =
    null
  public fields: FieldBase[] = []
  public refs: {
    collection: string
    field: string
  }[] = []

  constructor(
    name: string,
    type: FieldType,
    array: boolean,
    description: string,
    skipVectorization: boolean,
    tokenization: 'word' | 'field' | 'lowercase' | 'whitespace' | null,
  ) {
    this.name = name
    this.type = type
    this.array = array
    this.description = description
    this.skipVectorization = skipVectorization
    this.tokenization = tokenization
  }

  toJSON = () => {
    const type = this.type
    const conf: Record<string, any> = {
      name: this.name,
      type: type as string,
    }
    if (this.description) conf.description = this.description
    if (this.array === true) conf.array = true
    if (this.type === 'text') {
      if (this.tokenization) conf.tokenization = this.tokenization
      if (this.skipVectorization) {
        conf.skipTokenization = this.skipVectorization
        // conf.skipVectorization = this.skipVectorization
      }
    } else if (this.type === 'object') {
      conf.fields = this.fields.map((field) => field.toJSON())
    } else if (this.type === 'cref') {
      conf.refs = this.refs.map((ref) => ({
        collection: ref.collection,
        field: ref.field,
      }))
    }

    return conf
  }

  static fromJSON = (data: any) => {
    const type = data?.type

    switch (type) {
      case FieldTypes.int:
        return new IntField(data.name, data.description, data.array)
      case FieldTypes.number:
        return new NumberField(data.name, data.description, data.array)
      case FieldTypes.text:
        return new TextField(
          data.name,
          data.description,
          data.array,
          data.tokenization,
          data.skipTokenization,
        )
      case FieldTypes.uuid:
        return new UUIDField(data.name, data.description, data.array)
      case FieldTypes.date:
        return new DateField(data.name, data.description, data.array)
      case FieldTypes.boolean:
        return new BooleanField(data.name, data.description, data.array)
      case FieldTypes.object: {
        const field = new ObjectField(data.name, data.description, data.array)
        for (const f of data.fields) {
          field.add(FieldBase.fromJSON(f))
        }

        return field
      }
      case FieldTypes.phoneNumber:
        return new PhoneNumberField(data.name, data.description, data.array)
      case FieldTypes.geoCoordinates:
        return new GeoCoordinatesField(data.name, data.description, data.array)
      case FieldTypes.cref: {
        return new CrefField(
          data.name,
          data.description,
          data.refs.map((ref: any) => ({
            collection: ref.collection,
            field: ref.field,
          })),
        )
      }
      default:
        throw new Error('Invalid Field type')
    }
  }
}

class IntField extends FieldBase {
  type = FieldTypes.int

  constructor(name: string, description: string, array: boolean = false) {
    super(name, FieldTypes.int, array, description, false, null)
  }
}

class NumberField extends FieldBase {
  type = FieldTypes.number

  constructor(name: string, description: string, array: boolean = false) {
    super(name, FieldTypes.number, array, description, false, null)
  }
}

class TextField extends FieldBase {
  type = FieldTypes.text

  constructor(
    name: string,
    description: string,
    array: boolean = false,
    tokenization?: 'word' | 'field' | 'lowercase' | 'whitespace' | null,
    skipVectorization?: boolean,
  ) {
    super(
      name,
      FieldTypes.text,
      array,
      description,
      skipVectorization || false,
      tokenization || null,
    )
  }
}

class UUIDField extends FieldBase {
  type = FieldTypes.uuid

  constructor(name: string, description: string, array: boolean = false) {
    super(name, FieldTypes.uuid, array, description, false, null)
  }
}

class DateField extends FieldBase {
  type = FieldTypes.date

  constructor(name: string, description: string, array: boolean = false) {
    super(name, FieldTypes.date, array, description, false, null)
  }
}

class BooleanField extends FieldBase {
  type = FieldTypes.boolean

  constructor(name: string, description: string, array: boolean = false) {
    super(name, FieldTypes.boolean, array, description, false, null)
  }
}

class ObjectField extends FieldBase {
  type = FieldTypes.object

  constructor(
    name: string,
    description: string,
    array: boolean = false,
    fields: FieldBase[] = [],
  ) {
    super(name, FieldTypes.object, array, description, false, null)
    this.fields = fields
  }

  add = (...field: FieldBase[]) => {
    for (const f of field) {
      this.remove(f.name)
      this.fields.push(f)
    }

    return this
  }

  remove = (name: string) => {
    this.fields = this.fields.filter((field) => field.name !== name)

    return this
  }
}

class PhoneNumberField extends FieldBase {
  type = FieldTypes.phoneNumber

  constructor(name: string, description: string, array: boolean = false) {
    super(name, FieldTypes.phoneNumber, array, description, false, null)
  }
}

class GeoCoordinatesField extends FieldBase {
  type = FieldTypes.geoCoordinates

  constructor(name: string, description: string, array: boolean = false) {
    super(name, FieldTypes.geoCoordinates, array, description, false, null)
  }
}

class CrefField extends FieldBase {
  type = FieldTypes.cref

  constructor(
    name: string,
    description: string,
    refs: { collection: string; field: string }[] = [],
  ) {
    super(name, FieldTypes.cref, false, description, false, null)
    this.refs = refs
  }

  add = (collection: string | Collection, field: string | FieldBase) => {
    const collectionName =
      typeof collection === 'string' ? collection : collection.name
    const fieldName = typeof field === 'string' ? field : field.name

    if (field instanceof FieldBase && field.type !== FieldTypes.cref)
      throw new Error('Field must be of type cref')

    this.refs.push({
      collection: collectionName,
      field: fieldName,
    })

    return this
  }

  remove = (collection: string | Collection, field: string | FieldBase) => {
    const collectionName =
      typeof collection === 'string' ? collection : collection.name
    const fieldName = typeof field === 'string' ? field : field.name
    this.refs = this.refs.filter(
      (ref) => ref.collection !== collectionName && ref.field !== fieldName,
    )

    return this
  }
}

class Collection {
  public name: string = 'CustomCollection'
  public fields: any[] = []

  constructor(name: string, fields: FieldBase[] = []) {
    this.name = name
    this.fields = fields
  }

  add = (...field: FieldBase[]) => {
    for (const f of field) {
      this.fields.push(f)
    }

    return this
  }

  remove = (field: string | FieldBase) => {
    const fieldName = typeof field === 'string' ? field : field.name
    this.fields = this.fields.filter((field) => field.name !== fieldName)

    return this
  }

  toJSON = () => {
    return {
      name: this.name,
      fields: this.fields.map((field) => field.toJSON()),
    }
  }

  static fromJSON = (data: any) => {
    const name = data?.name
    const fields = data?.fields || []

    return new Collection(
      name,
      fields.map((field: any) => FieldBase.fromJSON(field)),
    )
  }
}

export class CustomSchema {
  static Collection = Collection
  static Field = {
    Int: IntField,
    Number: NumberField,
    Text: TextField,
    UUID: UUIDField,
    Date: DateField,
    Boolean: BooleanField,
    Object: ObjectField,
    PhoneNumber: PhoneNumberField,
    GeoCoordinates: GeoCoordinatesField,
    Cref: CrefField,
  }

  public name = 'customSchema'
  public options: {
    collections: Collection[]
    extend: Collection[]
  } = {
    collections: [],
    extend: [],
  }

  constructor() {}

  add = (...collection: Collection[]) => {
    for (const c of collection) {
      this.remove(c.name)
      this.options.collections.push(c)
    }

    return this
  }

  extend = (...collection: Collection[]) => {
    for (const c of collection) {
      this.remove(c)
      this.options.extend.push(c)
    }

    return this
  }

  remove = (collection: string | Collection) => {
    const collectionName =
      typeof collection === 'string' ? collection : collection.name

    this.options.collections = this.options.collections.filter(
      (collection) => collection.name !== collectionName,
    )

    this.options.extend = this.options.extend.filter(
      (collection) => collection.name !== collectionName,
    )

    return this
  }

  toJSON = () => {
    return {
      name: this.name,
      options: {
        collections: this.options.collections.map((collection) =>
          collection.toJSON(),
        ),
        extend: this.options.extend.map((collection) => collection.toJSON()),
      },
    }
  }

  static fromJSON = (data: any) => {
    const instance = new CustomSchema()

    for (const collection of data?.options?.collections || []) {
      instance.add(Collection.fromJSON(collection))
    }

    for (const collection of data?.options?.extend || []) {
      instance.add(Collection.fromJSON(collection))
    }

    return instance
  }
}
