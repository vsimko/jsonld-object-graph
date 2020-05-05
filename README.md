![](img/logo.svg)

[![Build Status](https://travis-ci.org/vsimko/jsonld-object-graph.svg?branch=master)](https://travis-ci.org/vsimko/jsonld-object-graph)
[![Known Vulnerabilities](https://snyk.io/test/github/vsimko/jsonld-object-graph/badge.svg?targetFile=package.json)](https://snyk.io/test/github/vsimko/jsonld-object-graph?targetFile=package.json)

The function `jsonld2obj` constructs an object graph in memory by resolving the `@id` properties recursively.
The graph can contain cycles. This is handy if you want to navigate graphs represented in RDF (as json-ld) from javascript code.

# Installation
```sh
# for yarn users
yarn add jsonld-object-graph

# for npm users
npm install jsonld-object-graph
```
**Note:** This library uses `jsonld` package as a dependency, which at some point depends on some native C code which needs to be compiled through `gyp`. Make sure you can compile native code on your platform. We build our package on Travis-CI, so you can take a look, how the build environment is configured (see [.travis.yml](.travis.yml) file).

# TL;DR
```js
const data = ... get JSON-LD data from somewhere ...
const {jsonld2obj, autoSimplifier, mutateGraphKeys} = require("jsonld-object-graph")
const graph = await jsonld2obj(data)
mutateGraphKeys(autoSimplifier)(graph)

graph.Gordon.knows.Alyx.name // -> "Alyx Vence"
graph.Gordon.knows.Alyx.knows.name // -> "Gordon Freeman"
```

# Example
```js
const {jsonld2obj} = require("jsonld-object-graph")
const data = [
  {
    "@context": {
      "@base": "http://halflife/",
      "@vocab": "http://schema.org/",
      "knows": {
        "@type" :"@id"
      }
    },
    "@id": "Gordon",
    "@type": "Person",
    "gender": "male",
    "name": "Gordon Freeman",
    "knows": [
      {
        "@id": "Alyx",
        "@type": ["Person", "Hacker"],
        "gender": "female",
        "name": "Alyx Vence",
        "knows": "Gordon",
        "owns": "Pistol",
      },
      "Barney"
    ],
    "owns": ["Gravity Gun", "Crowbar"]
  }
]

const graph = await jsonld2obj(data)
console.log(graph)
```

Generates the following output:
```
{ 'http://halflife/Gordon':
   { 'http://halflife/Gordon': [Circular],
   ...
   ...
}
```

Now it is possible to navigate the graph as follows:
```js
graph
  ["http://halflife/Alyx"]
  ["http://schema.org/knows"]
  ["http://schema.org/name"] // -> "Gordon Freeman"

graph
  ["http://halflife/Alyx"]
  ["http://schema.org/knows"]
  ["http://halflife/Gordon"]
  ["http://schema.org/name"] // -> "Gordon Freeman"
```

## Shorteninig of property names

Of course, we don't like these huge identifiers in our code.
To shorten the property names, such as `http://schema.org/knows` to `knows`, we can use the following function:
```js
const {autoSimplifier, mutateGraphKeys} = require("jsonld-object-graph")
mutateGraphKeys(autoSimplifier)(graph) // mutates the graph in-place
```

Now it is possible to navigate the graph as follows:
```js
graph.Gordon.knows.Alyx.name // -> "Alyx Vence"
graph.Gordon.knows.Alyx.knows.name // -> "Gordon Freeman"
```

The function `mutateGraphKeys` is not pure, it mutates the keys in the original graph.
During this process, an exception is thrown if an ambigous replacement has occured.

## Other replacement functions

- `dropPrefix` : removes prefix from each key
- `dropNsPrefix` : removes namespace prefix, e.g. `schema:`
- `toUnderscores` : replaces special characters to `_` to make navigation in javascript easier
- `afterLastSlash` : keeps the word after the last slash e.g. `http://schema.org/known` to `knows`
- `afterLastHash` : e.g. `http://something#abc` to `abc`
- `autoSimplifier` : combines multiple operations

## Replacements in a functional way

With ramda (or sanctuary) we can compose the replacements in a functional way as follows:
```js
const {compose, replace} = require("ramda")
const replacers = compose(
  dropNsPrefix("foaf"),
  dropNsPrefix("schema"),
  replace(/...regex.../, "..."), // custom regex replacement
  /* ... */
)
```

## Types resolved automagically

If your JSON-LD data contains the `@type` property, our function automatically resolves it into a javascript object and makes it accessible through `$type` property (for easier navigation in javascript)

```js
graph.Gordon.$type // -> Multival(Person)
graph.Alyx.$type // -> Multival(Person, Hacker)
```

## Configuration

Since v1.0.0, there is `defaultConfig` with sensible configuration parameters that can be customized as follows:
```js
const { jsonld2objWithConfig, defaultConfig } = require("jsonld-object-graph")
const myConfig = { ...defaultConfig, addSelfRef:false }
const jsonld2obj = jsonld2objWithConfig(myConfig)
```

The following param can be configured:
- **addSelfRef** (default `true`) whether to add self-reference e.g. `graph.Alyx.Alyx == graph.Alyx`
- **addTypeRef** (default `true`) whether to add the resolved type object as an reference to its instance 
- **shouldResolveTypeObjects** (default `true`) whether to resolve the "@type" as an object
- **idFieldName** (default `"$id"`) how the "@id" field should be renamed
- **typeFieldName** (default `"$type"`) how the "@type" field should be renamed

