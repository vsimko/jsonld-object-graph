# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.0.2"></a>
## [1.0.2](https://github.com/vsimko/jsonld-object-graph/compare/v1.0.0...v1.0.2) (2018-12-03)



<a name="1.0.0"></a>
# [1.0.0](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.7.0...v1.0.0) (2018-12-03)


### Features

* add configuration to the API using jsonld2objWithConfig ([df1279c](https://github.com/vsimko/graphql-jsonld-utils/commit/df1279c))
* MultiVal class now has `values()` and `keys()` methods ([f23f847](https://github.com/vsimko/graphql-jsonld-utils/commit/f23f847))


### BREAKING CHANGES

* the old method `first()` has been removed
in favor of `keys()` and `values()`.



<a name="0.7.0"></a>
# [0.7.0](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.5.0...v0.7.0) (2018-11-16)


### Features

* add function mutateAddInverse ([3f3c5a7](https://github.com/vsimko/graphql-jsonld-utils/commit/3f3c5a7))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.5.0...v0.6.0) (2018-07-30)


### Features

* add function mutateAddInverse ([a44b1f9](https://github.com/vsimko/graphql-jsonld-utils/commit/a44b1f9))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.4.0...v0.5.0) (2018-07-18)


### Bug Fixes

* many changes how flattened json-ld is converted ([dcee394](https://github.com/vsimko/graphql-jsonld-utils/commit/dcee394))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.3.1...v0.4.0) (2018-07-16)


### Features

* derive inverse properties automatically ([4d34961](https://github.com/vsimko/graphql-jsonld-utils/commit/4d34961))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.3.0...v0.3.1) (2018-07-13)


### Bug Fixes

* type resolution copied the object rather than referencing it ([9c1b62d](https://github.com/vsimko/graphql-jsonld-utils/commit/9c1b62d))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.2.1...v0.3.0) (2018-07-13)


### Features

* resolve `[@type](https://github.com/type)` automatically and establish bidirectional links ([4e4ab4d](https://github.com/vsimko/graphql-jsonld-utils/commit/4e4ab4d))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/vsimko/graphql-jsonld-utils/compare/v0.2.0...v0.2.1) (2018-07-13)


### Bug Fixes

* jsonld needs flatten instead of compact ([2036240](https://github.com/vsimko/graphql-jsonld-utils/commit/2036240))



<a name="0.2.0"></a>
# 0.2.0 (2018-07-13)


### Bug Fixes

* use json flatten() instead of compact() to get [@graph](https://github.com/graph) ([5b433ce](https://github.com/vsimko/graphql-jsonld-utils/commit/5b433ce))
* using compact instead of flatten again ([2442a71](https://github.com/vsimko/graphql-jsonld-utils/commit/2442a71))


### Features

* add base() which creates a jsonld context with just `[@base](https://github.com/base)` entry ([89a9aa0](https://github.com/vsimko/graphql-jsonld-utils/commit/89a9aa0))
* add mutateGraphKeys that can shorten long property names ([f3cf899](https://github.com/vsimko/graphql-jsonld-utils/commit/f3cf899))
