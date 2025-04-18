import assert from "node:assert";
import {
    AbstractJavaScriptIndexCreationTask,
    GetIndexesOperation,
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation
} from "../../../src/index.js";
import {disposeTestDocumentStore, testContext} from "../../Utils/TestUtil.js";
import {assertThat} from "../../Utils/AssertExtensions.js";
import {PutIndexesCommand} from "../../../src/Documents/Operations/Indexes/PutIndexesOperation";


describe("RDBC-899", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("should generate RQL for vector search with quantized embedding field", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withEmbedding("EmbeddingField", "Int8").targetQuantization("Int8"),
                factory => factory.byEmbedding([2.5, 3.3]), {
                    similarity: 0.65,
                    numberOfCandidates: 12
                })
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.i8(EmbeddingField), $p0, 0.65, 12)");
    });

    it("should generate RQL for vector search with field and text", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText("VectorField").usingTask("id-for-task-open-ai"),
                factory => factory.byText("aaaa"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.text(VectorField, ai.task('id-for-task-open-ai')), $p0, null, null)");
    });

    it("should generate RQL for vector search with field and embedding values", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withField("VectorField"),
                factory => factory.byEmbedding([0.3, 0.4, 0.5]))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(VectorField, $p0, null, null)");
    });

    it("should generate RQL for vector search with field and base64", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withField("VectorField"),
                factory => factory.byBase64("aaaa=="))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(VectorField, $p0, null, null)");
    });

    it("should generate RQL for vector search with text field and quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText("TextField").targetQuantization("Int8"),
                factory => factory.byText("aaaa"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.text_i8(TextField), $p0, null, null)");
    });

    it("should generate RQL for vector search with property selector for embedding field", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withEmbedding(dto => dto.EmbeddingSingles),
                factory => factory.byEmbedding([0.1, 0.2, 0.3]))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(EmbeddingSingles, $p0, null, null)");
    });

    it("should generate RQL for vector search with property selector and Int8 quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withEmbedding(dto => dto.EmbeddingSBytes, "Int8"),
                factory => factory.byEmbedding([1, 2, 3]), {
                    similarity: 0.75
                })
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.i8(EmbeddingSBytes), $p0, 0.75, null)");
    });

    it("should generate RQL for vector search with property selector and Binary quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withEmbedding(dto => dto.EmbeddingBinary, "Binary"),
                factory => factory.byEmbedding([0, 1, 0, 1]))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.i1(EmbeddingBinary), $p0, null, null)");
    });

    it("should generate RQL for vector search with property selector for text field", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText(dto => dto.TextualValue),
                factory => factory.byText("search text"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.text(TextualValue), $p0, null, null)");
    });

    it("should generate RQL for vector search with property selector for text field and using task", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText(dto => dto.TextualValue).usingTask("taskId-123"),
                factory => factory.byText("query text"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.text(TextualValue, ai.task('taskId-123')), $p0, null, null)");
    });

    it("should generate RQL for vector search with property selector for base64 field", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withBase64(dto => dto.EmbeddingBase64),
                factory => factory.byBase64("aGVsbG8="))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(EmbeddingBase64, $p0, null, null)");
    });

    it("should generate RQL for vector search with Single to Int8 quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withEmbedding(dto => dto.EmbeddingSingles).targetQuantization("Int8"),
                factory => factory.byEmbedding([0.1, 0.2, 0.3]))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.f32_i8(EmbeddingSingles), $p0, null, null)");
    });

    it("should generate RQL for vector search with Single to Binary quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withEmbedding(dto => dto.EmbeddingSingles).targetQuantization("Binary"),
                factory => factory.byEmbedding([0.1, 0.2, 0.3]))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.f32_i1(EmbeddingSingles), $p0, null, null)");
    });

    it("should generate RQL for vector search with text and Int8 quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText(dto => dto.TextualValue).targetQuantization("Int8"),
                factory => factory.byText("query text"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.text_i8(TextualValue), $p0, null, null)");
    });

    it("should generate RQL for vector search with text, task and Binary quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText(dto => dto.TextualValue)
                    .usingTask("openai-embeddings")
                    .targetQuantization("Binary"),
                factory => factory.byText("query text"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.text_i1(TextualValue, ai.task('openai-embeddings')), $p0, null, null)");
    });

    it("should generate RQL for vector search with withField using property selector", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withField(dto => dto.EmbeddingSingles),
                factory => factory.byEmbedding([0.1, 0.2, 0.3]), {
                    numberOfCandidates: 20
                })
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(EmbeddingSingles, $p0, null, 20)");
    });

    it("should generate RQL for vector search with exact parameter", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withField("VectorField"),
                factory => factory.byEmbedding([0.3, 0.4, 0.5]), {
                    isExact: true
                })
            .toString();

        assert.strictEqual(query, "from 'Dtos' where exact(vector.search(VectorField, $p0, null, null))");
    });

    it("should generate RQL for vector search with all parameters", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withField("VectorField"),
                factory => factory.byEmbedding([0.3, 0.4, 0.5]), {
                    similarity: 0.75,
                    numberOfCandidates: 50,
                    isExact: true
                })
            .toString();

        assert.strictEqual(query, "from 'Dtos' where exact(vector.search(VectorField, $p0, 0.75, 50))");
    });

    it("should generate RQL for vector search with exact parameter and embedding", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withEmbedding(dto => dto.EmbeddingSingles),
                factory => factory.byEmbedding([0.1, 0.2, 0.3]), {
                    isExact: true
                })
            .toString();

        assert.strictEqual(query, "from 'Dtos' where exact(vector.search(EmbeddingSingles, $p0, null, null))");
    });

    it("should generate RQL for vector search with exact parameter and text embedding", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText(dto => dto.TextualValue),
                factory => factory.byText("query text"), {
                    similarity: 0.8,
                    isExact: true
                })
            .toString();

        assert.strictEqual(query, "from 'Dtos' where exact(vector.search(embedding.text(TextualValue), $p0, 0.8, null))");
    });

    it("should create index with vector search field using index definition", async () => {
        await setupIndexDefinition(store);

        const indexDefinitions: IndexDefinition[] = await store.maintenance.send(new GetIndexesOperation(0, 10));


        assert.strictEqual(indexDefinitions[0].name, "Dtos/ByEmbeddingSingles");
        assert.strictEqual(indexDefinitions[0].indexType, "Map");
        assert.strictEqual(indexDefinitions[0].configuration["Indexing.Static.SearchEngineType"], "Corax");

        const vectorField = indexDefinitions[0].fields["FirstName"].vector;
        assert.strictEqual(vectorField.sourceEmbeddingType, "Text");
        assert.strictEqual(vectorField.destinationEmbeddingType, "Single");
        assert.strictEqual(vectorField.numberOfEdges, "23");
        assert.strictEqual(vectorField.numberOfCandidatesForIndexing, "20");
    });

    it("should create index with vector search using classes", async () => {
        await setupIndexClass(store);
        const indexDefinitions: IndexDefinition[] = await store.maintenance.send(new GetIndexesOperation(0, 10));

        assert.strictEqual(indexDefinitions.length, 1);
        const indexDefinition = indexDefinitions[0];

        assert.strictEqual(indexDefinition.name, "Dtos/ByEmbeddingSingles");
        assert.strictEqual(indexDefinition.indexType, "JavaScriptMap");
        assert.strictEqual(indexDefinition.configuration["Indexing.Static.SearchEngineType"], "Corax");

        const vectorField = indexDefinition.fields["vectorField"].vector;
        assert.strictEqual(vectorField.sourceEmbeddingType, "Text");
        assert.strictEqual(vectorField.destinationEmbeddingType, "Single");
        assert.strictEqual(vectorField.numberOfEdges, "33");
        assert.strictEqual(vectorField.numberOfCandidatesForIndexing, "43");
    })
});

class Dto {
    public EmbeddingBase64: string;
    public EmbeddingSingles: number[];
    public EmbeddingSBytes: number[]; // Unlike C#, TypeScript doesn't have sbyte[], so using number[]
    public EmbeddingBinary: Uint8Array | number[]; // TypeScript equivalent for byte[]
    public TextualValue: string;
}

class Dtos_ByEmbeddingSingles extends AbstractJavaScriptIndexCreationTask<Dto> {
    constructor() {
        super();

        this.map("Dtos", p => {
            return {
                "EmbeddingSingles": p.EmbeddingSingles,
            };
        });

        this.vectorField("vectorField", {
            numberOfEdges: 33,
            numberOfCandidatesForIndexing: 43,
            sourceEmbeddingType: "Text",
            destinationEmbeddingType: "Single"
        })

    }
}


async function setupIndexClass(store: IDocumentStore) {
    const dtoIndex = new Dtos_ByEmbeddingSingles();
    await dtoIndex.execute(store);
}

async function setupIndexDefinition(store: IDocumentStore) {
    const indexDefinition = new IndexDefinition();
    indexDefinition.name = "Dtos/ByEmbeddingSingles";
    indexDefinition.maps = new Set([`
        from doc in docs.Dtos 
        select new 
        { 
            doc.EmbeddingSingles, 
            EmbeddingSinglesVector = CreateVector(doc.EmbeddingSingles), 
         }`]);
    indexDefinition.fields = {
        "FirstName": {
            vector: {
                numberOfEdges: 23,
                numberOfCandidatesForIndexing: 20,
                sourceEmbeddingType: "Text",
                destinationEmbeddingType: "Single"
            }
        }
    }
    indexDefinition.configuration = {
        "Indexing.Static.SearchEngineType": "Corax"
    }
    const putIndexesOperation = new PutIndexesOperation(indexDefinition);

    const results = await store.maintenance.send(putIndexesOperation);
    assertThat(results).hasSize(1);
    assertThat(results[0].index).isEqualTo(indexDefinition.name);
}