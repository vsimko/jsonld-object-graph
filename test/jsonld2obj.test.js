const { jsonld2obj } = require("../src")

describe("#jsonld2obj", () => {
  it("should now work for simple types", async () => {
    const data = { a: 1, b: 2, c: "hello", d: [{ e: 1, f: [] }] }
    const graph = await jsonld2obj(data)
    expect(graph).toStrictEqual({})
  })

  it("should use @id to resolve objects", async () => {
    const data = [
      { "@id": "A", "schema:knows": { "@id": "B" } },
      { "@id": "B", "schema:knows": { "@id": "A" } }
    ]
    const graph = await jsonld2obj(data)
    expect(graph["/A"]).toBe(graph["/B"]["schema:knows"])
    expect(() => JSON.stringify(graph)).toThrow("circular structure")
  })

  it("single object should work", async () => {
    const graph = await jsonld2obj(
      {
        "@id": "x:Agent",
        "x:some": 0.9
      }
    )

    expect(graph).not.toBeUndefined()
    expect(graph["x:Agent"]["x:some"]).toBe(0.9)
  })

  it("should resolve `@type`", async () => {
    const graph = await jsonld2obj([
      {
        "@context": {
          "@base": "http:/a/"
        },
        "@id": "Agent",
        "@type": "AgentType",
        "x:some": 0.9
      },
      {
        "@id": "http:/a/AgentType",
        "x:label": "Agent type from our schema"
      }
    ])

    expect(graph["http:/a/AgentType"].$id).toEqual("http:/a/AgentType")
    expect(graph["http:/a/Agent"].$type.first()).toBe(graph["http:/a/AgentType"])
  })

    it("should resolve `@type` from other schema", async () => {
      const graph = await jsonld2obj([
        {
         "@id": "http://my/Agent",
         "@type": "http://other/AgentType",
         "x:some": 0.9
       },
       {
         "@id": "http://my/Agent2",
         "@type": "http://other/AgentType",
         "x:some": 0.9
       }
      ])
      expect(graph["http://my/Agent"].$type.first()).toBe(graph["http://other/AgentType"])
    })
})
