const jsonld = require('jsonld')
const {
  map,
  identity,
  uniq,
  compose,
  composeP,
  isEmpty,
  isNil,
  type,
  prop
} = require('ramda')

/** @pure */
const conversion = json => {
  const id2obj = {} // our mapping for objects with @id
  const type2fn = {} // map of functions handling different types during recursion
  const dispatch = x => {
    return type2fn[type(x)](x)
  }
  const resolveMappedObj = mapped => {
    const id = mapped['@id'] // try to resolve objects if @id is present
    if (id) {
      if (!id2obj[id]) id2obj[id] = {} // new object found
      return Object.assign(id2obj[id], mapped) // update cache
    }
    return mapped
  }
  Object.assign(type2fn, {
    String: identity,
    Number: identity,
    Boolean: identity,
    Null: identity,
    Array: compose(
      uniq,
      map(dispatch)
    ),
    Object: compose(
      resolveMappedObj,
      map(dispatch)
    )
  })
  const graph = dispatch(json)
  return { graph, id2obj }
}

/**
 * Converts JSON tree-structure into in-memory object graph containing
 * cyclic object references. This is achieved with the help of `@id` parameter
 * as specified by JSON-LD.
 *
 * Results is an object with the following properties:
 * - `graph`: the object graph (potentialy with cycles)
 * - `id2obj`: mapping `@id->object` in the `graph` for easy access
 * - `contexts`: contexts used for the json-ld transformation
 * @param {{[x:string]: string}} contexts
 */
const jsonld2obj = async (json, contexts) => {
  const flattenUsing = ctx => json => jsonld.flatten(json, ctx)
  const convertJsonAsync =
    isNil(contexts) || isEmpty(contexts)
      ? conversion
      : composeP(
          conversion,
          prop('@graph'),
          flattenUsing(contexts)
        )

  /** @type {{graph, id2obj:{[objUri:string]: {[propUri:string]:object} }}} */
  const result = await convertJsonAsync(json)
  return Object.freeze({ ...result, contexts })
}

/**
 * Changes keys within the graph by appluting the keyReplacer.
 * This function mutates the keys within objMapping and all objects on next level.
 * @param {(string) => string} keyReplacer
 */
const mutateGraphKeys = keyReplacer =>
  /** @param {{[subjUri:string]: {[predUri:string]: any}}} objMapping */
  objMapping => {
    for (const key0 of Object.keys(objMapping)) {
      const obj = objMapping[key0]
      for (const key of Object.keys(obj)) {
        const newKey = keyReplacer(key)

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
    return objMapping
  }

const base = ns => ({ '@base': ns })

module.exports = { jsonld2obj, mutateGraphKeys, base }
