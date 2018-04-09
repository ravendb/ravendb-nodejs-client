import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { stringifyJson, parseJson } from "../src/Utility/JsonUtil";

describe("JsonUtil module", () => {

    describe("stringifyJson()", () => {

        const o = {
            a: 1,
            prop: 2,
            obj: {
                prop2: "test"
            },
            arr: [
                1, 2, "test"
            ]
        };

        it("stringifies JSON", () => {
            const result = stringifyJson(o);
            assert.equal(`{"a":1,"prop":2,"obj":{"prop2":"test"},"arr":[1,2,"test"]}`, result);
        });

        it("stringifies PascalCased JSON", () => {
            const result = stringifyJson(o, "CAMEL_TO_PASCALCASE");
            assert.equal(`{"A":1,"Prop":2,"Obj":{"Prop2":"test"},"Arr":[1,2,"test"]}`, result);
        });

    });

    describe("parseJson()", () => {

        const o = {
            a: 1,
            prop: 2,
            obj: {
                prop2: "test"
            },
            arr: [
                1, 2, "test"
            ]
        };

        const JSON_PASCAL_CASED = `{"A":1,"Prop":2,"Obj":{"Prop2":"test"},"Arr":[1,2,"test"]}`;
        const JSON_CAMEL_CASED = `{"a":1,"prop":2,"obj":{"prop2":"test"},"arr":[1,2,"test"]}`;

        it("parse JSON", () => {
            const result = JSON.stringify(parseJson(JSON_CAMEL_CASED));
            assert.equal(JSON_CAMEL_CASED, result);
        });

        it("parses PascalCased JSON", () => {
            const result = JSON.stringify(parseJson(JSON_PASCAL_CASED, "PASCAL_TO_CAMELCASE"));
            assert.equal(JSON_CAMEL_CASED, result);
        });

    });

});