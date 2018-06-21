const { map, identity, prop, uniq, compose, composeP, isEmpty, type } = require('ramda')
const jsonld = require('jsonld')

const compactWithContexts = contexts => async json => jsonld.compact(json, contexts)

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
  // TODO: nicer would be to pass `id2obj` as parameter during the recursion
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

  // now we can fill the map because our functions are recursive
  // and they refer to the `dispatch` function
  Object.assign(type2fn, {
    String: identity,
    Number: identity,
    Boolean: identity,
    Null: identity,
    Array: compose(uniq, map(dispatch)),
    Object: compose(resolveMappedObj, map(dispatch))
  })

  const processJsonRecursively =
    isEmpty(contexts)
      ? dispatch
      : composeP(dispatch, prop('@graph'), compactWithContexts(contexts))

  // Note: this call alters the `id2obj` structure
  const graph = await processJsonRecursively(json)

  return { graph, id2obj, contexts }
}

module.exports = { jsonld2obj }
