import assert from "node:assert"
import { IncludesUtil } from "../../src/index.js";

describe("IncludesUtil", function () {

    function includedIds(document: object, include: string): string[] {
        const ids: string[] = [];
        IncludesUtil.include(document, include, id => ids.push(id));
        return ids;
    }

    it("include with prefix", () => {
        const ids = includedIds({ customerId: "1", number: "abc" }, "customerId(customer/)");

        assert.deepStrictEqual(ids, ["customer/1", "1"]);
    });

    it("include with suffix", () => {
        const ids = includedIds({ customerId: "1", number: "abc" }, "customerId[{0}/customer]");

        assert.deepStrictEqual(ids, ["1/customer", "1"]);
    });

    it("include with prefix of a numeric id", () => {
        const ids = includedIds({ supplierId: 5 }, "supplierId(suppliers/)");

        assert.deepStrictEqual(ids, ["suppliers/5"]);
    });

    it("include nested property", () => {
        const ids = includedIds({ address: { id: "addresses/1" } }, "address.id");

        assert.deepStrictEqual(ids, ["addresses/1"]);
    });

    it("include of a missing property yields no ids", () => {
        assert.deepStrictEqual(includedIds({ address: null }, "address.id"), []);
        assert.deepStrictEqual(includedIds({}, "address.id"), []);
    });

    it("include of an empty id yields no ids", () => {
        assert.deepStrictEqual(includedIds({ customerId: "" }, "customerId"), []);
    });

    it("include array of ids", () => {
        const ids = includedIds({ supplierIds: ["suppliers/1", "suppliers/2"] }, "supplierIds");

        assert.deepStrictEqual(ids, ["suppliers/1", "suppliers/2"]);
    });

    it("include property of array items", () => {
        const ids = includedIds(
            { lines: [{ product: "products/1" }, { product: "products/2" }] },
            "lines[].product");

        assert.deepStrictEqual(ids, ["products/1", "products/2"]);
    });

    it("include property of nested array items", () => {
        const ids = includedIds(
            {
                orders: [
                    { lines: [{ product: "products/1" }, { product: "products/2" }] },
                    { lines: [{ product: "products/3" }] }
                ]
            },
            "orders[].lines[].product");

        assert.deepStrictEqual(ids, ["products/1", "products/2", "products/3"]);
    });

    it("include property of dictionary values", () => {
        const ids = includedIds(
            { lines: { first: { product: "products/1" }, second: { product: "products/2" } } },
            "lines[].product");

        assert.deepStrictEqual(ids, ["products/1", "products/2"]);
    });

    it("include property of dictionary values skips non-object values", () => {
        const ids = includedIds(
            { lines: { first: { product: "products/1" }, second: "products/2" } },
            "lines[].product");

        assert.deepStrictEqual(ids, ["products/1"]);
    });

    it("include path syntax the server does not resolve yields no ids", () => {
        const lines = [{ product: "products/1" }, { product: "products/2" }];

        assert.deepStrictEqual(includedIds({ lines }, "lines[1].product"), []);
        assert.deepStrictEqual(includedIds({ lines }, "lines.count"), []);
        assert.deepStrictEqual(includedIds({ "address.id": "addresses/1" }, String.raw`address\.id`), []);
        assert.deepStrictEqual(includedIds({ lines }, "lines[x].product"), []);
    });
});
