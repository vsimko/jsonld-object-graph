# graphql-jsonld-utils
Using JSON-LD with GraphQL.

The function `jsonld2obj` constructs an object graph in memory by resolving the `@id` properties recursively.
The graph can contain cycles. It also constructs a `@id -> object` map for fast access to objects.

# Add dependency to your project
```console
$ yarn add https://github.com/vsimko/graphql-jsonld-utils.git
```

# Example
```js
const {jsonld2obj} = require('graphql-jsonld-utils')
const data = [
  {
    "@context": "https://json-ld.org/contexts/person.jsonld",
    "@id": "http://my/person/Gordon",
    "name": "Gordon Freeman",
    "knows": "http://my/person/Alyx"
  },
  {
    "@context": "https://json-ld.org/contexts/person.jsonld",
    "@id": "http://my/person/Alyx",
    "name": "Alyx Vence",
    "knows": "http://my/person/Gordon"
  }
]

const contexts = {
  '@base': 'http://my/person/',
  'foaf': 'http://xmlns.com/foaf/0.1/'
}
    
const {graph, id2obj} = await jsonld2obj(data, contexts)
console.log(graph)
```

Generates the following output:
```
[ { '@id': 'Gordon',
    'foaf:knows':
     { '@id': 'Alyx',
       'foaf:knows': [Circular],
       'foaf:name': 'Alyx Vence' },
    'foaf:name': 'Gordon Freeman' },
  { '@id': 'Alyx',
    'foaf:knows':
     { '@id': 'Gordon',
       'foaf:knows': [Circular],
       'foaf:name': 'Gordon Freeman' },
    'foaf:name': 'Alyx Vence' } ]
```

Now it is possible to navigate the graph as follows:
```js
id2obj.Gordon['foaf:knows']['foaf:name'] // -> "Alyx Vence"
id2obj.Gordon['foaf:knows']['foaf:knows']['foaf:name'] // -> "Gordon Freeman"
```

## Shorteninig of property names

Of course, we don't like these huge identifiers in our code.
To shorten the property names, such as `foaf:knows` to `knows`, we can use the following function:
```js
const replacers = x => x.replace(/^foaf:/, '')
mutateGraphKeys(replacers)(id2obj) // mutates the graph in id2obj
```

Now it is possible to navigate the graph as follows:
```js
id2obj.Gordon.knows.name // -> "Alyx Vence"
id2obj.Gordon.knows.knows.name // -> "Gordon Freeman"
```

The function `mutateGraphKeys` is not pure, it mutates the keys in the original graph.
During this process, an exception is thrown if an ambigous replacement occured.

## Replacements in a functional way

With ramda (or sanctuary) we can compose the replacements in a functional way as follows:
```js
const {compose, replace} = require('ramda')
const replacers = compose(
  replace(/^foaf:/, ''),
  replace(/^other:/, ''),
  /* ... */
)
```

## Types resolved automagically
If your JSON-LD data contains the `@type` property, our function automatically resolves it into a javascript object and establishes inverse links through the `instances` property.
```js
const { id2obj } = await jsonld2obj([
  {
   '@id': 'agent1',
   '@type': 'Agent',
   'rdfs:comment': "agent1 is an instance of Agent"
  },
  {
   '@id': 'Agent',
   'rdfs:comment': "Agent is a type defined in our schema"
  }
])
const replacers = compose(
  replace(":", '_'), // rdfs:comment -> rdfs_comment
  replace("@", ""), // @type -> type, @id -> id
)
mutateGraphKeys()(id2obj)

id2obj.agent1.rdfs_comment // -> "agent1 is an instance of Agent"
id2obj.agent1.type.rdfs_comment // -> "Agent is a type defined in our schema"
id2obj.Agent.instances.agent1.id // -> "agent1"
```


