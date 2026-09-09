import assert from "node:assert";
import { WhereToken } from "../../../../src/Documents/Session/Tokens/WhereToken.js";
import { VectorSearchToken } from "../../../../src/Documents/Session/Tokens/VectorSearchToken.js";
import { MoreLikeThisToken } from "../../../../src/Documents/Session/Tokens/MoreLikeThisToken.js";
import { StringBuilder } from "../../../../src/Utility/StringBuilder.js";
import { CONSTANTS } from "../../../../src/Constants.js";
import { vectorSearchConfigurationToMethodName } from "../../../../src/Utility/VectorSearchUtil.js";

describe("WhereToken.addAlias", function () {

    function write(token: WhereToken): string {
        const writer = new StringBuilder();
        token.writeTo(writer);
        return writer.toString();
    }

    it("prefixes the field name once and returns the same token", () => {
        const token = WhereToken.create("Equals", "Name", "p0");

        const aliased = token.addAlias("u");

        assert.strictEqual(aliased, token);
        assert.strictEqual(token.fieldName, "u.Name");
        assert.strictEqual(write(token), "u.Name = $p0");
    });

    it("leaves id() untouched", () => {
        const token = WhereToken.create("Equals", CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME, "p0");

        const aliased = token.addAlias("u");

        assert.strictEqual(aliased, token);
        assert.strictEqual(token.fieldName, CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME);
    });

    it("vector search token keeps vector.search() shape after aliasing", () => {
        const token = new VectorSearchToken("Embedding", "p0", "Single", "Single", null, null, false, false, null, null);

        const aliased = token.addAlias("o");

        assert.ok(aliased instanceof VectorSearchToken);
        assert.strictEqual(write(aliased), "vector.search(o.Embedding, $p0)");
    });

    it("vector search token keeps quantization, exact and similarity after aliasing", () => {
        const token = new VectorSearchToken("Description", "p1", "Text", "Int8", 0.75, 20, true, false, null, null);

        const aliased = token.addAlias("o");

        const methodName = vectorSearchConfigurationToMethodName("Text", "Int8");
        assert.strictEqual(write(aliased), `exact(vector.search(${methodName}(o.Description), $p1, 0.75, 20))`);
    });

    it("vector search on id() is not aliased", () => {
        const token = new VectorSearchToken(CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME, "p0", "Single", "Single", null, null, false, true, null, null);

        token.addAlias("o");

        assert.strictEqual(write(token), `vector.search(${CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME}, ${VectorSearchToken.EMBEDDING_FOR_DOCUMENT}($p0))`);
    });

    it("moreLikeThis token is not aliased", () => {
        const token = new MoreLikeThisToken();
        token.documentParameterName = "p0";

        const aliased = token.addAlias("o");

        assert.strictEqual(aliased, token);
        assert.strictEqual(write(token), "moreLikeThis($p0)");
    });
});
