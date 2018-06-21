const { map, identity, prop, uniq, compose, composeP, isEmpty, type } = require('ramda')
const jsonld = require('jsonld')

const compactWithContexts = contexts => async json => jsonld.compact(json, contexts)

/** @pure */
const conversion = json => {
  const id2obj = {} // our temporary cache for objects with @id
  const type2fn = {} // map of functions handling different types during recursion
  const dispatch = x => type2fn[type(x)](x)
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
    Array: compose(uniq, map(dispatch)),
    Object: compose(resolveMappedObj, map(dispatch))
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
 */
async function jsonld2obj (json, contexts = {}) {
  const convertJsonAsync =
    isEmpty(contexts)
      ? conversion
      : composeP(conversion, prop('@graph'), compactWithContexts(contexts))

  /** @type {{graph, id2obj:{[x:string]}}} */
  const result = await convertJsonAsync(json)
  return { ...result, contexts }
}
module.exports = { jsonld2obj }
