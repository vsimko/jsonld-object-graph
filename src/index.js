const jsonld = require('jsonld')
const {
  map,
  identity,
  uniq,
  compose,
  composeP,
  isEmpty,
  isNil,
  type
} = require('ramda')

const compactJsonldWithContexts = contexts => async json =>
  jsonld.compact(json, contexts)

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
  const convertJsonAsync =
    isNil(contexts) || isEmpty(contexts)
    ? conversion
    : composeP(
        conversion,
          compactJsonldWithContexts(contexts)
      )

  /** @type {{graph, id2obj:{[objUri:string]: {[propUri:string]:object} }}} */
  const result = await convertJsonAsync(json)
  return Object.freeze({ ...result, contexts })
}

}

module.exports = { jsonld2obj }
