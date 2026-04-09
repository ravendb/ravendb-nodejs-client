import assert from "node:assert";
import { MoreLikeThisToken } from "../../../../src/Documents/Session/Tokens/MoreLikeThisToken.js";
import { StringBuilder } from "../../../../src/Utility/StringBuilder.js";

describe("MoreLikeThisToken", function () {

    it("should write moreLikeThis(true) when whereTokens is empty", function () {
        const token = new MoreLikeThisToken();
        // no documentParameterName, no whereTokens
        const writer = new StringBuilder();
        token.writeTo(writer);
        assert.strictEqual(writer.toString(), "moreLikeThis(true)");
    });

    it("should write moreLikeThis(true, $opts) when whereTokens is empty with options", function () {
        const token = new MoreLikeThisToken();
        token.optionsParameterName = "p0";
        const writer = new StringBuilder();
        token.writeTo(writer);
        assert.strictEqual(writer.toString(), "moreLikeThis(true, $p0)");
    });

    it("should write moreLikeThis($docParam) when documentParameterName is set", function () {
        const token = new MoreLikeThisToken();
        token.documentParameterName = "p0";
        const writer = new StringBuilder();
        token.writeTo(writer);
        assert.strictEqual(writer.toString(), "moreLikeThis($p0)");
    });
});
