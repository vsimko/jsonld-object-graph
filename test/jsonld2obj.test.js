const { jsonld2obj } = require('../src')

const { HALFLIFE_PERSON_NS, FOAF_NS, HALFLIFE_JSONLD } = require('./common')

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
    const contexts = {
      '@base': HALFLIFE_PERSON_NS,
      foaf: FOAF_NS
    }

    const { graph, id2obj } = await jsonld2obj(HALFLIFE_JSONLD, contexts)

    expect(id2obj.Gordon).toEqual(id2obj.Alyx['foaf:knows'])
    expect(id2obj.Gordon['foaf:knows']['foaf:name']).toEqual('Alyx Vence')
    expect(id2obj.Gordon['foaf:knows']['foaf:knows']['foaf:name']).toEqual(
      'Gordon Freeman'
    )
    expect(() => JSON.stringify(graph)).toThrow('circular structure')
  })

  it('single object should work', async () => {
    const { id2obj } = await jsonld2obj({
      '@id': 'Agent',
      'x:some': 0.9
    })

    expect(id2obj).not.toBeUndefined()
    expect(id2obj.Agent['x:some']).toEqual(0.9)
  })

  it('array should work', async () => {
    const { id2obj } = await jsonld2obj([
       {
        '@id': 'Agent',
        'x:some': 0.9
      },
      {
        '@id': 'Agent2',
        'x:some': 0.9
      }
     ])

    expect(id2obj.Agent['x:some']).toEqual(0.9)
    expect(id2obj.Agent2['x:some']).toEqual(0.9)
  })

  it('should resolve `@type` and extablish `instances` link', async () => {
    const { id2obj } = await jsonld2obj([
      {
       '@id': 'Agent',
       '@type': 'http://myschema/Agent',
       'x:some': 0.9
     },
     {
       '@id': 'Agent2',
       '@type': 'http://myschema/Agent',
       'x:some': 0.9
     }
    ])
    expect(id2obj).toHaveProperty('http://myschema/Agent')
    expect(id2obj['http://myschema/Agent']).toEqual(id2obj.Agent['@type'])
    expect(id2obj.Agent['@type'].instances.Agent).toEqual(id2obj.Agent)
  })
})
