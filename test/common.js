const jsonld = require('jsonld')

const HALFLIFE_PERSON_NS = 'http://halflife/person/'
const FOAF_NS = 'http://xmlns.com/foaf/0.1/'

const HALFLIFE_CONTEXTS = {
  '@base': HALFLIFE_PERSON_NS,
  foaf: FOAF_NS
}

const mySchemaUrl = 'http://halflife/ctx/person.jsonld'

const documentLoaderContexts = {
  [mySchemaUrl]: {
    '@context': {
      name: FOAF_NS + 'name',
      knows: {
        '@id': FOAF_NS + 'knows',
        '@type': '@id'
      }
    }
  }
}

jsonld.documentLoader = (url, callback) => {
  if (url in documentLoaderContexts) {
    return callback(null, {
      contextUrl: null, // this is for a context via a link header
      document: documentLoaderContexts[url], // this is the actual document that was loaded
      documentUrl: url // this is the actual context URL after redirects
    })
  }
}

const idGordon = HALFLIFE_PERSON_NS + 'Gordon'
const idAlyx = HALFLIFE_PERSON_NS + 'Alyx'

const HALFLIFE_JSONLD = [
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

module.exports = {
  HALFLIFE_JSONLD,
  HALFLIFE_CONTEXTS,
  HALFLIFE_PERSON_NS,
  FOAF_NS
}
