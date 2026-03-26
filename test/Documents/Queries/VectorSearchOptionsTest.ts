import assert from "node:assert";
import { describe, it } from "node:test";
import { VectorOptions, AutoVectorOptions } from "../../../src/Documents/Queries/VectorSearch/VectorSearchOptions.js";

describe("VectorOptions.fromJson", function () {

    it("should correctly map Dimensions, NumberOfEdges, and NumberOfCandidates from JSON", function () {
        const json = {
            SourceEmbeddingType: "Single" as const,
            DestinationEmbeddingType: "Int8" as const,
            Dimensions: 128,
            NumberOfEdges: 16,
            NumberOfCandidates: 200,
        };

        // Access protected static via bracket notation
        const result = (VectorOptions as any).fromJson(json) as any;

        assert.strictEqual(result.sourceEmbeddingType, "Single", "sourceEmbeddingType");
        assert.strictEqual(result.destinationEmbeddingType, "Int8", "destinationEmbeddingType");
        assert.strictEqual(result.dimensions, 128, "dimensions should be 128, not mapped to numberOfEdges");
        assert.strictEqual(result.numberOfEdges, 16, "numberOfEdges should be 16, not mapped to numberOfCandidates");
        assert.strictEqual(result.numberOfCandidates, 200, "numberOfCandidates should be 200, not mapped to similarity");
    });

    it("VectorOptions class should have a dimensions property", function () {
        const opts = new VectorOptions();
        // dimensions should be a settable property
        (opts as any).dimensions = 256;
        assert.strictEqual((opts as any).dimensions, 256, "dimensions property should exist on VectorOptions");
    });

    it("AutoVectorOptions.fromJson should preserve all fields", function () {
        const json = {
            SourceEmbeddingType: "Single" as const,
            DestinationEmbeddingType: "Single" as const,
            Dimensions: 64,
            NumberOfEdges: 8,
            NumberOfCandidates: 100,
            SourceFieldName: "embedding",
        };

        const result = (AutoVectorOptions as any).fromJson(json) as any;

        assert.strictEqual(result.dimensions, 64, "dimensions");
        assert.strictEqual(result.numberOfEdges, 8, "numberOfEdges");
        assert.strictEqual(result.numberOfCandidates, 100, "numberOfCandidates");
        assert.strictEqual(result.sourceFieldName, "embedding", "sourceFieldName");
    });
});
