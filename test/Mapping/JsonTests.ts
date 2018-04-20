import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { 
    stringifyJson, 
    parseJson, 
    pascalCaseReplacer, 
    camelCaseReplacer, 
    pascalCaseReviver, 
    camelCaseReviver 
} from "../../src/Mapping/Json";

describe("Json module", () => {

    describe("stringifyJson()", () => {

        const o = {
            a: 1,
            prop: 2,
            obj: {
                prop2: "test"
            },
            Arr: [
                1, 2, "test"
            ],
            "@metadata": {}
        };

        it("stringifies JSON", () => {
            const result = stringifyJson(o);
            assert.equal(`{"a":1,"prop":2,"obj":{"prop2":"test"},"Arr":[1,2,"test"],"@metadata":{}}`, result);
        });

        it("stringifies to PascalCased JSON", () => {
            const result = stringifyJson(o, pascalCaseReplacer);
            assert.equal(`{"A":1,"Prop":2,"Obj":{"Prop2":"test"},"Arr":[1,2,"test"],"@metadata":{}}`, result);
        });

        it("stringifies to camelCased JSON", () => {
            const result = stringifyJson(o, camelCaseReplacer);
            assert.equal(result, `{"a":1,"prop":2,"obj":{"prop2":"test"},"arr":[1,2,"test"],"@metadata":{}}`);
        });


    });

    describe("parseJson()", () => {

        const o = {
            a: 1,
            prop: 2,
            obj: {
                prop2: "test"
            },
            Arr: [
                1, 2, "test"
            ],
            "@metadata": {}
        };

        const JSON_PASCAL_CASED = `{"A":1,"Prop":2,"Obj":{"Prop2":"test"},"Arr":[1,2,"test"],"@metadata":{}}`;
        const JSON_CAMEL_CASED = `{"@metadata":{},"a":1,"prop":2,"obj":{"prop2":"test"},"arr":[1,2,"test"]}`;

        it("parse JSON", () => {
            const result = JSON.stringify(parseJson(JSON_CAMEL_CASED));
            assert.equal(result, JSON_CAMEL_CASED);
        });

        it("parses PascalCased JSON to camelCased object", () => {
            const result = JSON.stringify(parseJson(JSON_PASCAL_CASED, camelCaseReviver));
            assert.equal(JSON_CAMEL_CASED, result);
        });

        it("parses PascalCased JSON to PascalCased object", () => {
            const result = JSON.stringify(parseJson(JSON_PASCAL_CASED, pascalCaseReviver));
            assert.equal(JSON_PASCAL_CASED, result);
        });

        it("parses JSON with keys starting with @", () => {
            // tslint:disable-next-line:max-line-length
            const jsonString = `{"Results":[{"Name":"Marcin","Age":30,"@metadata":{"@change-vector":"A:1-raDVjL7QqEC3EBoL2rpHYA","@id":"users/1","@last-modified":"2018-04-20T13:58:37.2156934Z"}}],"Includes":{}}`;
            const result = parseJson(jsonString, camelCaseReviver);
            assert.ok(result.results[0]["@metadata"]);
            assert.equal("A:1-raDVjL7QqEC3EBoL2rpHYA", result.results[0]["@metadata"]["@change-vector"]);
        });

    });

});
