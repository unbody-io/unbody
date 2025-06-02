import { z } from 'zod'
import {
  Collection,
  CollectionConfig,
  CrossReferencePropertyConfig,
  customCollectionRegex,
  customPropertyRegex,
  extraPropertyRegex,
  PropertyType,
  PropertyTypes,
  TokenizationMethod,
  TokenizationMethods,
  UnbodyProjectSettingsDoc,
} from '../core-types'
import { PluginRegistry } from '../plugins/registry/PluginRegistry'
import { PluginResources } from '../plugins/resources/PluginResources'
import { Modules } from './modules/Modules'
import { Plugins } from './plugins/Plugins'
import { Collections, ProjectContext } from './project-context'
import { Services } from './services'

export class Unbody {
  public ctx: ProjectContext

  public modules: Modules
  public plugins: Plugins
  public services: Services

  constructor(
    private readonly _settings: UnbodyProjectSettingsDoc,
    private readonly _pluginRegistry: PluginRegistry,
    private readonly _pluginResources: PluginResources,
  ) {
    this.ctx = new ProjectContext(this._settings)

    this.plugins = new Plugins(
      this.ctx,
      this._pluginRegistry,
      this._pluginResources,
    )
    this.modules = new Modules(this.ctx, this.plugins)
    this.services = new Services(this.ctx, this.plugins, this.modules)
  }

  static async validateSettings(
    settings: UnbodyProjectSettingsDoc,
    pluginRegistry: PluginRegistry,
  ) {
    const textVectorizer = () => {
      const plugins = [
        ...Object.keys(pluginRegistry.textVectorizers),
        ...Object.keys(pluginRegistry.multimodalVectorizers),
      ]

      if (plugins.length === 0) {
        return z.undefined({
          message: 'No available textVectorizer plugins found',
        })
      }

      return z.object({
        name: z
          .enum(plugins as [string, ...string[]], {
            invalid_type_error:
              plugins.length === 0 ? 'No plugins found' : undefined,
          })
          .describe('The name of the text vectorizer plugin.'),
        options: z
          .record(z.any())
          .optional()
          .default({})
          .describe("The options to override plugin's default configurations."),
      })
    }

    const imageVectorizer = () => {
      const plugins = [
        ...Object.keys(pluginRegistry.imageVectorizers),
        ...Object.keys(pluginRegistry.multimodalVectorizers),
      ]

      if (plugins.length === 0) {
        return z.undefined({
          message: 'No available imageVectorizer plugins found',
        })
      }

      return z.object({
        name: z
          .enum(plugins as [string, ...string[]], {})
          .describe('The name of the image vectorizer plugin.'),
        options: z
          .record(z.any())
          .optional()
          .default({})
          .describe("The options to override plugin's default configurations."),
      })
    }

    const reranker = () => {
      const plugins = Object.keys(pluginRegistry.rerankers)

      if (plugins.length === 0) {
        return z.undefined({ message: 'No available reranker plugins found' })
      }

      return z.object({
        name: z
          .enum(plugins as [string, ...string[]])
          .describe('The name of the reranker plugin.'),
        options: z
          .record(z.any())
          .optional()
          .default({})
          .describe("The options to override plugin's default configurations."),
      })
    }

    const generative = () => {
      const plugins = Object.keys(pluginRegistry.generative)

      if (plugins.length === 0) {
        return z.undefined({ message: 'No available generative plugins found' })
      }

      return z.object({
        name: z
          .enum(plugins as [string, ...string[]])
          .describe('The name of the generative plugin.'),
        options: z
          .record(z.any())
          .optional()
          .default({})
          .describe("The options to override plugin's default configurations."),
      })
    }

    const fileParsers = async () => {
      const plugins = Object.keys(pluginRegistry.fileParsers)

      const schemas = await Promise.all(
        plugins.map(async (key) => {
          const plugin = pluginRegistry.fileParsers[key]!

          const options = await plugin.runner.getSchema('parseFileOptions')
          if (!options)
            return z.object({
              name: z.literal(key),
            })

          return z.object({
            name: z.literal(key),
            options: options.optional().default({}),
          })
        }),
      )

      const parserConfigSchema = z.discriminatedUnion(
        'name',
        schemas as [
          z.ZodObject<{
            name: z.ZodLiteral<string>
          }>,
        ],
      )

      return z
        .record(
          z
            .union([
              parserConfigSchema,
              z.array(parserConfigSchema),
              z.undefined(),
            ])
            .transform((value) => {
              if (!value) return []
              if (Array.isArray(value)) return value
              return [value]
            }),
        )
        .default({})
    }

    const autoEnhancer = async () => {
      const plugins = Object.keys(pluginRegistry.enhancers)

      const schemas: z.ZodObject<any>[] = []

      for (const key of plugins) {
        const plugin = pluginRegistry.enhancers[key]!
        const args = await plugin.runner.getSchema('args')

        schemas.push(
          z.object({
            name: z.literal(key),
            options: args
              ? (args as z.ZodObject<any>).partial().optional().default({})
              : z.undefined(),
          }),
        )
      }

      return z.discriminatedUnion('name', schemas as any).optional()
    }

    const enhancement = async () => {
      const plugins = Object.keys(pluginRegistry.enhancers)

      const argSchema = z.discriminatedUnion('type', [
        z.object({
          type: z.literal('literal'),
          value: z.any(),
        }),
        z.object({
          type: z.literal('computed'),
          value: z.string(),
        }),
      ])

      return z
        .object({
          pipelines: z
            .array(
              z.object({
                name: z.string().regex(/^[a-zA-Z0-9_]+$/, {
                  message: 'Pipeline name must match /^[a-zA-Z0-9_]+$/',
                }),
                collection: z.string(),
                if: z.string().optional(),
                vars: z.record(argSchema).optional().default({}),
                steps: z
                  .array(
                    z.object({
                      name: z.string().regex(/^[a-zA-Z0-9_]+$/),
                      action: z.object({
                        name: z.enum(plugins as [string, ...string[]]),
                        args: z.record(argSchema),
                      }),
                      output: z.record(argSchema),
                      if: z.string().optional(),
                      onFailure: z
                        .enum(['continue', 'stop'])
                        .optional()
                        .default('stop'),
                    }),
                  )
                  .min(1)
                  .superRefine((steps, ctx) => {
                    const stepNames: Record<string, number> = {}
                    for (const step of steps) {
                      stepNames[step.name] = (stepNames[step.name] || 0) + 1
                    }

                    for (let i = 0; i < steps.length; i++) {
                      const step = steps[i]!
                      const occurrences = stepNames[step.name] || 0

                      occurrences > 1 &&
                        ctx.addIssue({
                          code: z.ZodIssueCode.custom,
                          fatal: true,
                          path: [i, 'name'],
                          message: `Duplicate step name: ${step.name}`,
                        })
                    }
                  }),
              }),
            )
            .optional()
            .default([])
            .superRefine((value, ctx) => {
              const byCollection = value.reduce(
                (acc, pipeline) => {
                  if (!acc[pipeline.collection]) acc[pipeline.collection] = []
                  acc[pipeline.collection]!.push(pipeline.name)
                  return acc
                },
                {} as Record<string, string[]>,
              )

              for (let i = 0; i < value.length; i++) {
                const pipeline = value[i]!
                const count = byCollection[pipeline.collection]!.filter(
                  (name) => name === pipeline.name,
                ).length

                if (count > 1)
                  ctx.addIssue({
                    fatal: true,
                    code: z.ZodIssueCode.custom,
                    path: [i, 'name'],
                    message: `Duplicate pipeline name: "${pipeline.name}" in "${pipeline.collection}" collection`,
                  })
              }
            }),
        })
        .optional()
    }

    const customSchema = async () => {
      const customCollectionProperty = (
        type: PropertyType,
        reservedNames: string[] = [],
      ): z.ZodObject<any, any> => {
        const base = () =>
          z.object({
            type: z.literal(type),
            name: z
              .string()
              .regex(customPropertyRegex, {
                message: `Property name must match ${customPropertyRegex.toString()}`,
              })
              .superRefine((name, ctx) => {
                if (reservedNames.includes(name)) {
                  ctx.addIssue({
                    fatal: true,
                    code: z.ZodIssueCode.custom,
                    message: `"${name}" is a reserved name. Reserved names: ${reservedNames.map((name) => `"${name}"`).join(', ')}`,
                  })
                }
              }),
            array: z.boolean().optional().default(false),
            required: z.boolean().optional().default(false),
            description: z.string().optional().default(''),
          })

        switch (type) {
          case PropertyTypes.int:
          case PropertyTypes.number:
          case PropertyTypes.uuid:
          case PropertyTypes.date:
          case PropertyTypes.boolean:
          case PropertyTypes.phoneNumber:
          case PropertyTypes.geoCoordinates:
          case PropertyTypes.blob:
            return base()

          case PropertyTypes.text:
            return base().extend({
              vectorize: z.boolean().optional().default(true),
              tokenization: z
                .enum<
                  TokenizationMethod,
                  [TokenizationMethod, ...TokenizationMethod[]]
                >(Object.values(TokenizationMethods) as [TokenizationMethod, ...TokenizationMethod[]])
                .default('word'),
            })

          case PropertyTypes.object:
            return base().extend({
              properties: z
                .array(
                  z.discriminatedUnion('type', [
                    customCollectionProperty(PropertyTypes.int),
                    customCollectionProperty(PropertyTypes.number),
                    customCollectionProperty(PropertyTypes.text),
                    customCollectionProperty(PropertyTypes.uuid),
                    customCollectionProperty(PropertyTypes.date),
                    customCollectionProperty(PropertyTypes.boolean),
                    customCollectionProperty(PropertyTypes.phoneNumber),
                    customCollectionProperty(PropertyTypes.geoCoordinates),
                  ]),
                )
                .min(1),
            })

          case PropertyTypes.cref:
            return base().extend({
              refs: z.array(
                z.object({
                  collection: z.string(),
                  property: z.string(),
                }),
              ),
              onDelete: z
                .enum(['CASCADE', 'REMOVE_REFERENCE', 'NO_ACTION'])
                .optional(),
              onUpdate: z
                .enum(['CASCADE', 'UPDATE_REFERENCE', 'NO_ACTION'])
                .optional(),
            })
        }
      }

      const extraProperty = (
        type: PropertyType,
        reservedNames: string[] = [],
      ) => {
        const base = () =>
          z.object({
            type: z.literal(type),
            name: z
              .string()
              .regex(extraPropertyRegex, {
                message: `Extra property name must match ${extraPropertyRegex.toString()}`,
              })
              .superRefine((name, ctx) => {
                if (reservedNames.includes(name)) {
                  ctx.addIssue({
                    fatal: true,
                    code: z.ZodIssueCode.custom,
                    message: `"${name}" is a reserved name. Reserved names: ${reservedNames.map((name) => `"${name}"`).join(', ')}`,
                  })
                }
              }),
            array: z.boolean().optional().default(false),
            required: z.boolean().optional().default(false),
            description: z.string().optional().default(''),
          })

        switch (type) {
          case PropertyTypes.int:
          case PropertyTypes.number:
          case PropertyTypes.uuid:
          case PropertyTypes.date:
          case PropertyTypes.boolean:
          case PropertyTypes.phoneNumber:
          case PropertyTypes.geoCoordinates:
          case PropertyTypes.blob:
            return base()

          case PropertyTypes.text:
            return base().extend({
              vectorize: z.boolean().optional().default(true),
              tokenization: z
                .enum<
                  TokenizationMethod,
                  [TokenizationMethod, ...TokenizationMethod[]]
                >(Object.values(TokenizationMethods) as [TokenizationMethod, ...TokenizationMethod[]])
                .default('word'),
            })

          case PropertyTypes.object:
            return base().extend({
              properties: z
                .array(
                  z.discriminatedUnion('type', [
                    customCollectionProperty(PropertyTypes.int),
                    customCollectionProperty(PropertyTypes.number),
                    customCollectionProperty(PropertyTypes.text),
                    customCollectionProperty(PropertyTypes.uuid),
                    customCollectionProperty(PropertyTypes.date),
                    customCollectionProperty(PropertyTypes.boolean),
                    customCollectionProperty(PropertyTypes.phoneNumber),
                    customCollectionProperty(PropertyTypes.geoCoordinates),
                  ]),
                )
                .min(1),
            })

          case PropertyTypes.cref:
            return base().extend({
              refs: z.array(
                z.object({
                  collection: z.string(),
                  property: z.string(),
                }),
              ),
              onDelete: z
                .enum(['CASCADE', 'REMOVE_REFERENCE', 'NO_ACTION'])
                .optional(),
              onUpdate: z
                .enum(['CASCADE', 'UPDATE_REFERENCE', 'NO_ACTION'])
                .optional(),
            })
        }
      }

      const reservedProperties = [
        '_id',
        'id',
        '_additional',
        'createdAt',
        'modifiedAt',
        'remoteId',
        'sourceId',
      ]

      return z
        .object({
          collections: z
            .array(
              z.object({
                name: z.string().regex(customCollectionRegex, {
                  message: `Collection name must match ${customCollectionRegex.toString()}`,
                }),
                properties: z
                  .array(
                    z
                      .discriminatedUnion('type', [
                        customCollectionProperty(
                          PropertyTypes.int,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.number,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.text,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.uuid,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.date,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.boolean,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.phoneNumber,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.geoCoordinates,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.blob,
                          reservedProperties,
                        ),
                        customCollectionProperty(
                          PropertyTypes.cref,
                          reservedProperties,
                        ),
                      ])
                      .superRefine((value, ctx) => {
                        if (value['type'] === PropertyTypes.cref) {
                          const prop = value as CrossReferencePropertyConfig
                          const refs = prop.refs
                          for (let i = 0; i < refs.length; i++) {
                            const ref = refs[i]!
                            const collectionClass =
                              Collections.BUILTIN_COLLECTIONS.find(
                                (col) =>
                                  Collection.getName(col) === ref.collection,
                              )
                            if (collectionClass) {
                              const collection =
                                Collection.getMetadata(collectionClass)
                              const property = collection.properties.find(
                                (prop) => prop.name === ref.property,
                              )
                              if (
                                !property ||
                                property.options.type !== 'cref'
                              ) {
                                ctx.addIssue({
                                  code: z.ZodIssueCode.custom,
                                  path: [...ctx.path, 'refs', i, 'property'],
                                  message: `Property "${ref.property}" does not exist in collection "${ref.collection}"`,
                                })
                              }
                            }
                          }
                        }
                      }),
                  )
                  .superRefine((value, ctx) => {
                    const propertyNames: Record<string, number> = {}
                    for (const property of value) {
                      propertyNames[property['name']] =
                        (propertyNames[property['name']] || 0) + 1
                    }

                    for (let i = 0; i < value.length; i++) {
                      const property = value[i]!
                      const occurrences = propertyNames[property['name']] || 0
                      occurrences > 1 &&
                        ctx.addIssue({
                          code: z.ZodIssueCode.custom,
                          path: [i, 'name'],
                          message: `Duplicate property name: "${property['name']}"`,
                        })
                    }
                  }),
              }),
            )
            .default([])
            .optional(),
          extend: z
            .array(
              z.object({
                name: z.enum(
                  Collections.BUILTIN_COLLECTIONS.map((col) =>
                    Collection.getName(col),
                  ) as [string, ...string[]],
                ),
                properties: z
                  .array(
                    z
                      .discriminatedUnion('type', [
                        extraProperty(PropertyTypes.int, reservedProperties),
                        extraProperty(PropertyTypes.number, reservedProperties),
                        extraProperty(PropertyTypes.text, reservedProperties),
                        extraProperty(PropertyTypes.uuid, reservedProperties),
                        extraProperty(PropertyTypes.date, reservedProperties),
                        extraProperty(
                          PropertyTypes.boolean,
                          reservedProperties,
                        ),
                        extraProperty(
                          PropertyTypes.phoneNumber,
                          reservedProperties,
                        ),
                        extraProperty(
                          PropertyTypes.geoCoordinates,
                          reservedProperties,
                        ),
                        extraProperty(PropertyTypes.blob, reservedProperties),
                      ])
                      .superRefine((value, ctx) => {}),
                  )
                  .superRefine((value, ctx) => {
                    const propertyNames: Record<string, number> = {}
                    for (const property of value) {
                      propertyNames[property.name] =
                        (propertyNames[property.name] || 0) + 1
                    }

                    for (let i = 0; i < value.length; i++) {
                      const property = value[i]!
                      const occurrences = propertyNames[property.name] || 0
                      occurrences > 1 &&
                        ctx.addIssue({
                          code: z.ZodIssueCode.custom,
                          path: [i, 'name'],
                          message: `Duplicate property name: "${property.name}"`,
                        })
                    }
                  }),
              }),
            )
            .default([])
            .optional(),
        })
        .optional()
        .default({})
        .transform((value, ctx) => {
          const { collections = [], extend = [] } = value

          const extended = Collections.BUILTIN_COLLECTIONS.map((col) => {
            const name = Collection.getName(col)
            const existing = extend.find(
              (collection) => collection.name === name,
            )
            if (existing) return existing

            return {
              name,
              properties: [],
            }
          }) as CollectionConfig[]

          for (const collection of collections) {
            const crefs = collection.properties.filter(
              (prop) => prop['type'] === PropertyTypes.cref,
            )
            for (const cref of crefs) {
              const property = cref as CrossReferencePropertyConfig
              for (const ref of property.refs) {
                const extension = extended.find(
                  (col) => col.name === ref.collection,
                )
                if (extension) {
                  const extendedProperty = extension.properties.find(
                    (prop) => prop.name === ref.property,
                  ) as CrossReferencePropertyConfig | undefined
                  if (extendedProperty) {
                    extendedProperty.refs.push({
                      collection: collection.name,
                      property: property.name,
                    })
                  } else {
                    extension.properties.push({
                      name: ref.property,
                      type: PropertyTypes.cref,
                      refs: [
                        {
                          collection: collection.name,
                          property: property.name,
                        },
                      ],
                    })
                  }
                }
              }
            }
          }

          return {
            collections,
            extend: extended.filter((col) => col.properties.length > 0),
          }
        })
    }

    const schema = z.object({
      textVectorizer: textVectorizer(),
      imageVectorizer: imageVectorizer().optional(),
      reranker: reranker().optional(),
      generative: generative().optional(),
      fileParsers: await fileParsers(),

      autoSummary: await autoEnhancer(),
      autoVision: await autoEnhancer(),
      enhancement: await enhancement(),

      customSchema: await customSchema(),
    })

    return schema.parseAsync(settings, { async: true })
  }
}
