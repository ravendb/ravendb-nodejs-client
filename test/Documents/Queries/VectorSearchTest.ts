import assert from "node:assert";
import {IDocumentStore} from "../../../src/index.js";
import {disposeTestDocumentStore, testContext} from "../../Utils/TestUtil.js";


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
            .vectorSearch(x => x.withField("VectorField"),
                factory => factory.byText("aaaa"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(VectorField, $p0)");
    });

    it("should generate RQL for vector search with field and embedding values", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withField("VectorField"),
                factory => factory.byEmbedding([0.3, 0.4, 0.5]))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(VectorField, $p0)");
    });

    it("should generate RQL for vector search with field and base64", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withField("VectorField"),
                factory => factory.byBase64("aaaa=="))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(VectorField, $p0)");
    });

    it("should generate RQL for vector search with text field and quantization", async () => {
        const session = store.openSession();

        const query = session.query<Dto>({collection: "Dtos"})
            .vectorSearch(x => x.withText("TextField").targetQuantization("Int8"),
                factory => factory.byText("aaaa"))
            .toString();

        assert.strictEqual(query, "from 'Dtos' where vector.search(embedding.text_i8(TextField), $p0)");
    });
});

class Dto {
    public EmbeddingBase64: string;
    public EmbeddingSingles: number[];
    public EmbeddingSBytes: number[]; // Unlike C#, TypeScript doesn't have sbyte[], so using number[]
    public EmbeddingBinary: Uint8Array | number[]; // TypeScript equivalent for byte[]
    public TextualValue: string;
}

// class DummyIndexJs extends AbstractJavaScriptIndexCreationTask {
//     constructor() {
//         super();
//         this.maps = new Set([
//             `map('Dtos', function (dto) {
//                 return {
//                     Singles: createVector(dto.EmbeddingSingles),
//                     Integers: createVector(dto.EmbeddingSBytes),
//                     Binary: createVector(dto.EmbeddingBinary)
//                 };
//             })`
//         ]);
//
//         this.fields = {
//             "Integers": {
//                 vector: {
//                     sourceEmbeddingType: "Int8",
//                     destinationEmbeddingType: "Int8"
//                 }
//             },
//             "Singles": {
//                 vector: {
//                     sourceEmbeddingType: VectorEmbeddingType.Single,
//                     destinationEmbeddingType: VectorEmbeddingType.Single
//                 }
//             },
//             "Binary": {
//                 vector: {
//                     sourceEmbeddingType: VectorEmbeddingType.Binary,
//                     destinationEmbeddingType: VectorEmbeddingType.Binary
//                 }
//             }
//         };
//     }
// }
//
// class DummyIndex extends AbstractJavaScriptIndexCreationTask<Dto> {
//     constructor() {
//         super();
//         this.map = "from dto in dtos " +
//             "select new { " +
//             "Singles = createVector(dto.EmbeddingSingles), " +
//             "Integers = createVector(dto.EmbeddingSBytes), " +
//             "Binary = createVector(dto.EmbeddingBinary) " +
//             "}";
//
//         this.vector("Integers", factory => factory.sourceEmbedding("Int8"));
//         this.vector("Binary", factory => factory.sourceEmbedding(VectorEmbeddingType.Binary));
//     }
// }

