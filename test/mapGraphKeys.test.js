const { FOAF_NS, HALFLIFE_JSONLD, HALFLIFE_PERSON_NS } = require('./common')
const { mutateGraphKeys, jsonld2obj, base } = require('../src')
const { replace } = require('ramda')

describe('#mapGraphKeys', () => {
  it('should map properties of objects', async () => {
    const { id2obj } = await jsonld2obj(
      HALFLIFE_JSONLD,
      base(HALFLIFE_PERSON_NS)
    )
    const replacer = replace(FOAF_NS, '')
    const id2objMapped = mutateGraphKeys(replacer)(id2obj)
    expect(id2objMapped).toEqual(id2obj)
    expect(id2objMapped.Gordon.foaf_knows).toEqual(id2objMapped.Alyx)
  })
})
