const jsonld = require("jsonld")

const {
  map,
  identity,
  indexBy,
  compose,
  composeP,
  type,
  prop,
  replace,
  last,
  split,
  values
} = require("ramda")

const defaultConfig = {
  addSelfRef: true,
  addTypeRef: true,
  shouldResolveTypeObjects: true,
  idFieldName: "$id",
  typeFieldName: "$type"
}

const ensureSlot = (obj, pname) => {
  if (!obj[pname]) {
    obj[pname] = {}
  }
  return obj[pname]
}

/**
 * Renames a key in an object.
 * The rename takes place only if the key existed in the object.
 * The original object is modified, therefore this function NOT PURE.
 * We us this for mapping `@id` an `@type`.
 */
const impureRenameKey = (oldKey, newKey) => object => {
  if (object[oldKey] !== undefined) {
    object[newKey] = object[oldKey]
    delete object[oldKey]
  }
  return object
}

/**
 * We use this class for representing multiple values in a property.
 * TODO: why do we use a class instead of just an array ?
 */
class MultiVal {
  /** Preferred factory method */
  static fromObject (x) {
    return new MultiVal(x)
  }

  constructor (x) {
    Object.assign(this, x)
  }

  values () {
    return Object.values(this)
  }

  keys () {
    return Object.keys(this)
  }
}

/**
 * This function is pure.
 */
const conversion = (config = defaultConfig) => json => {
  const id2obj = {} // our mapping for objects with @id
  const type2fn = {} // a map of functions handling different datatypes during recursion
  const dispatch = x => type2fn[type(x)](x)
  const resolveMappedObj = mapped => {
    if (mapped["@value"]) {
      return mapped["@value"]
    }
    if (!mapped[config.idFieldName]) {
      return mapped
    }
    const mappedSlot = ensureSlot(id2obj, mapped[config.idFieldName])

    // special reference to self for easier graph navigation
    if (config.addSelfRef) {
      mappedSlot[mapped[config.idFieldName]] = mappedSlot
    }

    // resolve the type object if defined and allowed in the config
    const typeObjOrTypeId = mapped[config.typeFieldName]
    if (config.shouldResolveTypeObjects && typeObjOrTypeId) {
      const typeObj = typeObjOrTypeId
      let types
      if (typeObj instanceof MultiVal) {
        types = compose(
          MultiVal.fromObject,
          indexBy(prop(config.idFieldName)),
          map(typeId => {
            const typeObj = ensureSlot(id2obj, typeId)
            typeObj[config.idFieldName] = typeId
            return typeObj
          }),
          values
        )(typeObj)
      } else {
        const typeId = typeObjOrTypeId
        const typeObj = ensureSlot(id2obj, typeId)
        typeObj[config.idFieldName] = typeId
        types = MultiVal.fromObject({ [typeId]: typeObj })
      }
      mapped[config.typeFieldName] = types
    }
    return Object.assign(mappedSlot, mapped) // update cache
  }

  let localSeq = 0 // local sequence used for generating keys in multi-value properties
  Object.assign(type2fn, {
    String: identity,
    Number: identity,
    Boolean: identity,
    Null: identity,
    Array: compose(
      MultiVal.fromObject,
      indexBy(x => {
        return x[config.idFieldName] ? x[config.idFieldName] : "_" + localSeq++
      }),
      map(dispatch)
    ),
    Object: compose(
      resolveMappedObj,
      impureRenameKey("@type", config.typeFieldName),
      impureRenameKey("@id", config.idFieldName),
      map(dispatch)
    )
  })
  dispatch(json)
  return id2obj
}

/**
 * Converts JSON tree-structure into in-memory object graph containing
 * cyclic object references. This is achieved with the help of `@id` parameter
 * as specified by JSON-LD.
 *
 * Results is an graph encoded as follows:
 * - the graph potentially contains cycles
 * - the data structure is derived from the flattened JSON-LD
 * - on first level, there are objects indexed by their `@id`
 * - `@id` and `@type` are converted to `$id` and `$type` for easier navigation
 *   (this can be changed in `config.idFieldName` and `config.typeFieldName`)
 */
const jsonld2objWithConfig = (config = defaultConfig) =>
  composeP(
    conversion(config),
  prop("@graph"), // Note: ["@graph"] is always there after jsonld.flatten
  json => jsonld.flatten(json, {})
)

/**
 * Changes keys within the graph by applying the keyReplacer.
 * This function mutates the keys within objMapping and all objects on next level.
 * @param {(string) => string} keyReplacer
 */
function mutateGraphKeys (keyReplacer) {
  const mutateKeys = obj => {
    for (const key of Object.keys(obj)) {
      const newKey = keyReplacer(key)

      // mutate also multival references
      if (obj[key] instanceof MultiVal) {
        mutateGraphKeys(keyReplacer)(obj[key])
      }

      // we ignore keys that were not replaced
      if (newKey !== key) {
        if (newKey in obj) {
          // TODO: maybe we should ignore the replacement silently if some flag is turned on ?
          throw new Error(
            `Trying to replace property ${key} into ${newKey} which already exists in the object.`
          )
        }
        const old = obj[key]
        delete obj[key]
        obj[newKey] = old
      }
    }
  }

  return graph => {
    mutateKeys(graph) // mutate the top-level keys
    values(graph).forEach(mutateKeys) // mutate the properties within each object
    return graph
  }
}

/**
 * @param {string} prop
 * @example
 * mutateAddInverse('memberOf')(graph)
 * mutateAddInverse('$type')(graph)
 */
const mutateAddInverse = prop => graph => {
  Object.entries(graph).forEach(([k, obj]) => {
    if (obj[prop]) {
      values(obj[prop]).forEach(tobj => {
        const inverseProperty = ensureSlot(tobj, "$" + prop)
        inverseProperty[k] = obj
      })
    }
  })
}

/**
 * @example
 * mutateRenameProp('$$contains', 'container')(id2obj)
 */
const mutateRenameProp = (from, to) => mutateGraphKeys(replace(from, to))

const dropPrefix = prefix => replace(new RegExp("^" + prefix), "")
const dropNsPrefix = nsprefix => dropPrefix(nsprefix + ":")
const toUnderscores = replace(/[:/]/g, "_")
const afterLastSlash = compose(
  last,
  split("/")
)
const afterLastHash = compose(
  last,
  split("#")
)
const autoSimplifier = compose(
  toUnderscores,
  afterLastSlash,
  afterLastHash
)

const base = ns => ({ "@base": ns })

module.exports = {
  jsonld2objWithConfig,
  jsonld2obj: jsonld2objWithConfig(defaultConfig),
  dropPrefix,
  dropNsPrefix,
  toUnderscores,
  afterLastSlash,
  afterLastHash,
  autoSimplifier,
  mutateGraphKeys,
  mutateAddInverse,
  mutateRenameProp,
  base
}
