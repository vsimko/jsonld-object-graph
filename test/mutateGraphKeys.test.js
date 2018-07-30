const { mutateGraphKeys, jsonld2obj, autoSimplifier, mutateAddInverse } = require("../src")
const halflifeDoc = require("./data/halflife.json")
const eventDoc = require("./data/event.json")

describe("#mutateGraphKeys", () => {
  it("should mutate the original object", async () => {
    const graph = await jsonld2obj(halflifeDoc)
    const mutatedGraph = mutateGraphKeys(autoSimplifier)(graph)
    expect(mutatedGraph).toBe(graph)
    expect(graph.Gordon.knows.Alyx).toBe(graph.Alyx)
    expect(graph.Alyx.knows).toBe(graph.Gordon)
    expect(graph.Alyx.knows.Gordon).toBe(graph.Alyx.knows)
    expect(graph.Gordon.$type.Person).toBe(graph.Person)
    expect(graph.Alyx.$type.Person).toBe(graph.Person)
    expect(graph.Alyx.$type.Hacker).toBe(graph.Hacker)
  })

  it("Event document from https://json-ld.org", async () => {
    const graph = await jsonld2obj(eventDoc)
    mutateGraphKeys(autoSimplifier)(graph)
    expect(graph.__b0.location).toMatch("Orleans")
    expect(graph.__b0.summary).toStrictEqual("Lady Gaga Concert")
  })
})

describe("@mutateAddInverse", () => {
  it("Should add $$type as an inverse of @type", async () => {
    const graph = await jsonld2obj(halflifeDoc)
    mutateGraphKeys(autoSimplifier)(graph)
    mutateAddInverse("$type")(graph)
    expect(graph.Person.$$type.Alyx).toBe(graph.Alyx)
    expect(graph.Person.$$type.Gordon).toBe(graph.Gordon)
    expect(graph.Hacker.$$type.Alyx).toBe(graph.Alyx)
    expect(graph.Hacker.$$type.Gordon).toBeUndefined()
  })
})
