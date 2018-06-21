const { jsonld2obj } = require('../src')

const jsonld = require('jsonld')

const CONTEXTS = {
  'http://test/ctx/person.jsonld': {
    '@context': {
      'name': 'http://xmlns.com/foaf/0.1/name',
      'knows': {
        '@id': 'http://xmlns.com/foaf/0.1/knows',
        '@type': '@id'
      }
    }
  }
}

jsonld.documentLoader = (url, callback) => {
  if (url in CONTEXTS) {
    return callback(null, {
      contextUrl: null, // this is for a context via a link header
      document: CONTEXTS[url], // this is the actual document that was loaded
      documentUrl: url // this is the actual context URL after redirects
    })
  }
}

describe('#jsonld2obj', () => {
  it('should work for simple types', async () => {
    const data = { a: 1, b: 2, c: 'hello', d: [{ e: 1, f: [] }] }
    const { graph } = await jsonld2obj(data)
    expect(graph).toEqual(data)
  })

  it('should use @id to resolve objects', async () => {
    const a = { '@id': 'A', knows: { '@id': 'B' } }
    const b = { '@id': 'B', knows: { '@id': 'A' } }
    const data = [a, b]
    const { graph, id2obj } = await jsonld2obj(data)
    expect(id2obj.A).toEqual(id2obj.B.knows)
    expect(() => JSON.stringify(graph)).toThrow('circular structure')
  })

  it('should work with `@context`', async () => {
    const myInstancesNs = 'http://test/person/'
    const mySchemaUrl = 'http://test/ctx/person.jsonld'

    const idGordon = myInstancesNs + 'Gordon'
    const idAlyx = myInstancesNs + 'Alyx'

    const data = [
      {
        '@context': mySchemaUrl,
        '@id': idGordon,
        name: 'Gordon Freeman',
        knows: idAlyx
      },
      {
        '@context': mySchemaUrl,
        '@id': idAlyx,
        name: 'Alyx Vence',
        knows: idGordon
      }
    ]

    const contexts = {
      '@base': myInstancesNs,
      'foaf': 'http://xmlns.com/foaf/0.1/'
    }

    const { graph, id2obj } = await jsonld2obj(data, contexts)
    // console.log(JSON.stringify(data, null, 2))
    // console.log(graph)

    expect(id2obj.Gordon).toEqual(id2obj.Alyx['foaf:knows'])
    expect(id2obj.Gordon['foaf:knows']['foaf:name']).toEqual('Alyx Vence')
    expect(id2obj.Gordon['foaf:knows']['foaf:knows']['foaf:name']).toEqual('Gordon Freeman')
    expect(() => JSON.stringify(graph)).toThrow('circular structure')
  })
})
