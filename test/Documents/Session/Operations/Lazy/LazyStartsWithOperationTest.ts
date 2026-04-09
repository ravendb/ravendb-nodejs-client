import assert from "node:assert";
import { LazyStartsWithOperation } from "../../../../../src/Documents/Session/Operations/Lazy/LazyStartsWithOperation.js";
import { DocumentConventions } from "../../../../../src/Documents/Conventions/DocumentConventions.js";

describe("LazyStartsWithOperation", function () {

    function createOperation(opts: { matches?: string; exclude?: string; startAfter?: string }) {
        const conventions = DocumentConventions.defaultConventions;
        const sessionOps = {
            conventions,
        } as any;

        return new LazyStartsWithOperation(
            "users/",
            {
                matches: opts.matches,
                exclude: opts.exclude,
                start: 0,
                pageSize: 25,
                startAfter: opts.startAfter,
            } as any,
            sessionOps
        );
    }

    it("should not encode undefined matches as literal 'undefined' string", function () {
        const op = createOperation({});
        const request = op.createRequest();
        assert.ok(!request.query.includes("undefined"),
            `Query should not contain 'undefined', got: ${request.query}`);
        assert.ok(request.query.includes("matches=&"),
            `Query should contain 'matches=&' (empty value), got: ${request.query}`);
    });

    it("should not encode undefined exclude as literal 'undefined' string", function () {
        const op = createOperation({});
        const request = op.createRequest();
        assert.ok(!request.query.includes("undefined"),
            `Query should not contain 'undefined', got: ${request.query}`);
        assert.ok(request.query.includes("exclude=&"),
            `Query should contain 'exclude=&' (empty value), got: ${request.query}`);
    });

    it("should not encode undefined startAfter as literal 'undefined' string", function () {
        const op = createOperation({});
        const request = op.createRequest();
        // startAfter is at the end of the query string
        assert.ok(!request.query.includes("undefined"),
            `Query should not contain 'undefined', got: ${request.query}`);
    });

    it("should correctly encode provided matches value", function () {
        const op = createOperation({ matches: "A*" });
        const request = op.createRequest();
        assert.ok(request.query.includes("matches=A"),
            `Query should contain encoded matches value, got: ${request.query}`);
    });
});
