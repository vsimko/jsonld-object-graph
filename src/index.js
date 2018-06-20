const { map, identity, composeP, prop, uniq, compose, isEmpty } = require('ramda')
const jsonld = require('jsonld')

/** Same as built-in javascript `typeof` but returns `array` for Arrays */
function betterTypeOf (x) {
  if (typeof x === 'object' && x instanceof Array) return 'array'
  return typeof x
}

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
  const dispatch = x => type2fn[betterTypeOf(x)](x)

  // now we can fill the map because our functions are recursive
  // and they refer to the `dispatch` function
  Object.assign(type2fn, {
    string: identity,
    number: identity,
    boolean: identity,
    undefined: identity,
    array: compose(uniq, map(dispatch)),
    object: x => {
      // first recursively map the given json-tree
      // json is always without cycles
      const mapped = map(dispatch, x)

      const id = x['@id'] // try to resolve objects if @id is present
      if (id) {
        if (!id2obj[id]) id2obj[id] = {} // new object found
        return Object.assign(id2obj[id], mapped) // update cache
      }
      return mapped
    }
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
