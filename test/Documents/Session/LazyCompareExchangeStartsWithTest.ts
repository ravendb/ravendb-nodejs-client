import assert from "node:assert";
import { describe, it } from "node:test";
import { LazyGetCompareExchangeValuesOperation } from "../../../src/Documents/Session/Operations/Lazy/LazyGetCompareExchangeValuesOperation.js";
import { DocumentConventions } from "../../../src/Documents/Conventions/DocumentConventions.js";

describe("LazyGetCompareExchangeValuesOperation", function () {

    it("should include startsWith parameter when it has a value", function () {
        const conventions = DocumentConventions.defaultConventions;
        const fakeClusterSession = {
            isTracked: () => false,
            session: { conventions },
            getCompareExchangeValuesFromSessionInternal: () => ({}),
        } as any;

        const op = new LazyGetCompareExchangeValuesOperation(
            fakeClusterSession,
            null,
            conventions,
            "prefix/",  // startsWith
            0,
            25
        );

        const request = (op as any).createRequest();

        assert.ok(request, "Request should not be null");
        assert.ok(
            request.query.includes("startsWith="),
            "URL should contain startsWith parameter when value is 'prefix/'. Got: " + request.query
        );
        assert.ok(
            request.query.includes("prefix"),
            "URL should contain the actual prefix value. Got: " + request.query
        );
    });

    it("should NOT include startsWith parameter when it is empty", function () {
        const conventions = DocumentConventions.defaultConventions;
        const fakeClusterSession = {
            isTracked: () => false,
            session: { conventions },
            getCompareExchangeValuesFromSessionInternal: () => ({}),
        } as any;

        const op = new LazyGetCompareExchangeValuesOperation(
            fakeClusterSession,
            null,
            conventions,
            "",  // startsWith empty
            0,
            25
        );

        const request = (op as any).createRequest();

        assert.ok(request, "Request should not be null");
        assert.ok(
            !request.query.includes("startsWith="),
            "URL should NOT contain startsWith when value is empty. Got: " + request.query
        );
    });
});
