import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { stringifyJson, JSON_SERIALIZATION_TRANSORM, parseJson } from "../../src/Mapping/Json";

describe("Json module", () => {

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
            const result = stringifyJson(o, JSON_SERIALIZATION_TRANSORM.targetJsonPascalCase .replacer);
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
            const result = JSON.stringify(
                parseJson(JSON_PASCAL_CASED, JSON_SERIALIZATION_TRANSORM.targetJsonPascalCase.reviver));
            assert.equal(JSON_CAMEL_CASED, result);
        });

    });

});
