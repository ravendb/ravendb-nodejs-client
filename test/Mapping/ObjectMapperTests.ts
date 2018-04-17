import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    TypesAwareObjectMapper, IRavenObject, ObjectTypeDescriptor, ClassConstructor    
} from "../../src";
import { DateUtil } from "../../src/Utility/DateUtil";
import { TypeInfo } from "../../src/Mapping/ObjectMapper";

describe.only("ObjectMapper", function () {

    let mapper: TypesAwareObjectMapper = new TypesAwareObjectMapper({
        dateFormat: DateUtil.DEFAULT_DATE_FORMAT
    });

    beforeEach(() => {
        mapper = new TypesAwareObjectMapper({
            dateFormat: DateUtil.DEFAULT_DATE_FORMAT
        });
    });

    describe("fromObjectLiteral()", function () {

        it("can handle Date type", () => {
            const typeInfo = {
                nestedTypes: {
                    bornAt: "date" 
                }
            };

            const result: IRavenObject = mapper.fromObjectLiteral({ bornAt: "1998-05-06T00:00:00.0000000" }, typeInfo);
            assert.ok(result);
            assert.ok(result.hasOwnProperty("bornAt"));

            const bornAt: Date = result.bornAt;
            assert.ok(bornAt instanceof Date);
            assert.ok(typeof bornAt.getMonth === "function");
            assert.equal(bornAt.getFullYear(), 1998);
            assert.equal(bornAt.getDate(), 6);
            assert.equal(bornAt.getMonth(), 4);
        });

        it("can handle array", () => {
            const typeInfo = {
                nestedTypes: {
                    "dates[]": "date"
                }
            };

            const result: IRavenObject = mapper.fromObjectLiteral({
                dates: [
                    "1998-05-06T00:00:00.0000000",
                    "1998-05-06T00:00:00.0000000",
                    "1998-05-06T00:00:00.0000000"
                ]
            }, typeInfo);

            assert.ok(result);
            assert.ok(result.hasOwnProperty("dates"));

            const dates: Date[] = result.dates;
            assert.equal(3, dates.length);
            for (const d of dates) {
                assert.ok(typeof d !== "string");
                assert.ok(d instanceof Date);
                assert.ok(typeof d.getMonth === "function");
                assert.equal(d.getFullYear(), 1998);
                assert.equal(d.getDate(), 6);
                assert.equal(d.getMonth(), 4);
            }
        });

        it ("can handle top-level ctor", () => {
            throw "Not implemented";
        });

        it ("can handle properties of objects in array", () => {
            throw "Not implemented";

        });

        it ("can handle ctor", () => {

            class Person {
                constructor(public name: string) {}

                public sayHello() {
                    return `Hello, I'm ${this.name}.`;
                }
            }

            const testObject = {
                me: { name: "Greg", bornAt: "1987-10-12T00:00:00.0000000" },
                people: [
                    { name: "John" },
                    { name: "Samantha" }
                ]
            };

            const typeInfo: TypeInfo = {
                nestedTypes: {
                    "me": "Person", 
                    "me.bornAt": "date",
                    "people[]": "Person"    
                }
            };
            const types = new Map<string, ObjectTypeDescriptor>([
                [ "Person", Person ]
            ]);
            const result: any = mapper.fromObjectLiteral(testObject, typeInfo, types);

            assert.ok(result);
            assert.ok(result.me);
            assert.equal(result.me.constructor.name, Person.name);
            assert.equal(result.me.name, "Greg")
            assert.equal(typeof result.me.sayHello, "function");
            assert.equal(result.me.sayHello(), "Hello, I'm Greg.");
            assert.equal(result.me.bornAt.getFullYear(), 1987);

            assert.equal(result.people[0].constructor.name, Person.name);
            assert.equal(result.people[0].name, "John");
            assert.equal(result.people[0].sayHello(), "Hello, I'm John.");

            assert.equal(result.people[1].name, "Samantha");
            assert.equal(result.people[1].sayHello(), "Hello, I'm Samantha.");
        });

        it("can handle dot operator", () => {
            const data = { 
                person: {
                    bornAt: "1987-10-12T00:00:00.0000000" 
                }                
            };

            const typeInfo = {
                nestedTypes: {
                    "person.bornAt": "date"
                }
            };

            const result: any = mapper.fromObjectLiteral(data, typeInfo);
            assert.ok(result);
            assert.ok(result.person);
            assert.ok(result.person.bornAt);
            assert.equal(typeof result.person.bornAt, "object");
            assert.ok(result.person.bornAt.getFullYear);
            assert.equal(result.person.bornAt.getFullYear(), 1987);
        });

        it ("can handle object literal descriptor", () => {
            throw "Not implemented";
        });

        it ("can handle complex objects with nested class instances, arrays and dates", () => {
            throw "Not implemented";
        });

    });

});
