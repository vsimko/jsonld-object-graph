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

const ensureSlot = (obj, pname) => {
  if (!obj[pname]) {
    obj[pname] = {}
  }
  return obj[pname]
}

const normalizeField = field => x => {
  const oldKey = "@" + field
  if (x[oldKey]) {
    const newKey = "$" + field
    x[newKey] = x[oldKey]
    delete x[oldKey]
  }
  return x
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

/** @pure */
const conversion = json => {
  const id2obj = {} // our mapping for objects with @id
  const type2fn = {} // map of functions handling different types during recursion
  const dispatch = x => type2fn[type(x)](x)
  const resolveMappedObj = mapped => {
    if (mapped["@value"]) {
      return mapped["@value"]
    }
    if (!mapped.$id) {
      return mapped
    }
    const mappedSlot = ensureSlot(id2obj, mapped.$id)

    mappedSlot[mapped.$id] = mappedSlot // special link to self for easier graph navigation

    // resolve the type object if defined
    if (mapped.$type) {
      let types
      if (mapped.$type instanceof MultiVal) {
        types = compose(
          MultiVal.fromObject,
          indexBy(prop("$id")),
          map(typeId => {
            const typeObj = ensureSlot(id2obj, typeId)
            typeObj.$id = typeId
            return typeObj
          }),
          values
        )(mapped.$type)
      } else {
        const typeId = mapped.$type
        const typeObj = ensureSlot(id2obj, typeId)
        typeObj.$id = typeId
        types = MultiVal.fromObject({ [typeId]: typeObj })
      }
      mapped.$type = types
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
        return x.$id ? x.$id : "_" + localSeq++
      }),
      map(dispatch)
    ),
    Object: compose(
      resolveMappedObj,
      normalizeField("id"), // @id -> $id
      normalizeField("type"), // @type -> $type
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
 */
const jsonld2obj = composeP(
  conversion,
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
  jsonld2obj,
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
