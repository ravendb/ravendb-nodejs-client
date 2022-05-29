import * as assert from "assert";

import {
    TypesAwareObjectMapper,
    IRavenObject,
    ObjectTypeDescriptor,
    PropsBasedObjectLiteralDescriptor,
    DocumentConventions
} from "../../src";
import { DateUtil } from "../../src/Utility/DateUtil";
import { TypeInfo } from "../../src/Mapping/ObjectMapper";
import { TypeUtil } from "../../src/Utility/TypeUtil";

describe("ObjectMapper", function () {

    let mapper: TypesAwareObjectMapper;
    let conventions;

    beforeEach(() => {
        conventions = DocumentConventions.defaultConventions;
        mapper = new TypesAwareObjectMapper({
            dateFormat: DateUtil.DEFAULT_DATE_FORMAT,
            documentConventions: conventions
        });
    });

    class Person {
        constructor(public name: string) {
        }

        public sayHello() {
            return `Hello, I'm ${this.name}.`;
        }
    }

    class Movie {
        constructor(
            public name: string,
            public releasedAt: Date
        ) {
        }
    }

    class Tree {
        constructor(public name: string) {
        }
    }

    class Order {
        constructor(public orderId: number, public isSent: false) {
        }
    }

    interface IAnimal {
        name: string;
        legsCount: number;

        run();
    }

    class AnimalTypeDescriptor extends PropsBasedObjectLiteralDescriptor<IAnimal> {

        public name = "Animal";
        public properties = ["name", "legsCount"];

        public construct(dto: object): IAnimal {
            return Object.assign({} as IAnimal, dto, {
                run() {
                    return `Running ${this.name} on ${this.legsCount} legs.`;
                }
            });
        }
    }

    describe("fromObjectLiteral()", function () {

        it("can handle Date type", () => {
            const typeInfo = {
                nestedTypes: {
                    bornAt: "date"
                }
            };

            const result: IRavenObject = mapper.fromObjectLiteral(
                { bornAt: "1998-05-06T00:00:00.0000000" }, typeInfo);
            assert.ok(result);
            // eslint-disable-next-line no-prototype-builtins
            assert.ok(result.hasOwnProperty("bornAt"));

            const bornAt: Date = result.bornAt;
            assert.ok(bornAt instanceof Date);
            assert.ok(typeof bornAt.getMonth === "function");
            assert.strictEqual(bornAt.getFullYear(), 1998);
            assert.strictEqual(bornAt.getDate(), 6);
            assert.strictEqual(bornAt.getMonth(), 4);
        });

        it("can handle boolean", () => {
            const data = {
                success: false
            };

            const result: any = mapper.fromObjectLiteral(data, {});
            assert.ok(!result.success);
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
            // eslint-disable-next-line no-prototype-builtins
            assert.ok(result.hasOwnProperty("dates"));

            const dates: Date[] = result.dates;
            assert.strictEqual(3, dates.length);
            for (const d of dates) {
                assert.ok(typeof d !== "string");
                assert.ok(d instanceof Date);
                assert.ok(typeof d.getMonth === "function");
                assert.strictEqual(d.getFullYear(), 1998);
                assert.strictEqual(d.getDate(), 6);
                assert.strictEqual(d.getMonth(), 4);
            }
        });

        it("can handle top-level ctor", () => {
            const typeInfo = {
                typeName: Person.name
            };

            const result: any = mapper.fromObjectLiteral({
                name: "Merry"
            }, typeInfo, new Map([[Person.name, Person]]));

            assert.ok(result);
            assert.strictEqual(result.constructor.name, Person.name);
            assert.strictEqual(result.constructor, Person);
            assert.strictEqual(result.name, "Merry");
            assert.strictEqual(result.sayHello(), "Hello, I'm Merry.");
        });

        it("can handle properties of objects in array", () => {
            const typeInfo = {
                nestedTypes: {
                    "movies[]": Movie.name,
                    "movies[].releasedAt": "date"
                }
            };

            const testObject = {
                movies: [
                    {
                        name: "Matrix",
                        releasedAt: "1999-06-06T00:00:00.0000000"
                    },
                    {
                        name: "Titanic",
                        releasedAt: "1998-07-07T00:00:00.0000000"
                    },
                    null
                ]
            };

            const result: any = mapper.fromObjectLiteral(
                testObject, typeInfo, new Map([[Movie.name, Movie]]));

            assert.ok(result);
            // eslint-disable-next-line no-prototype-builtins
            assert.ok(result.hasOwnProperty("movies"));
            assert.strictEqual(result.movies.length, 3);
            assert.strictEqual(result.movies[0].name, "Matrix");
            assert.strictEqual(result.movies[1].name, "Titanic");
            assert.strictEqual(result.movies[2], null);

            for (const movie of result.movies) {
                if (!movie) {
                    continue;
                }

                const releasedAt = movie.releasedAt;
                assert.ok(releasedAt);
                assert.ok(typeof releasedAt !== "string");
                assert.strictEqual(typeof releasedAt.getFullYear, "function");
                assert.ok(releasedAt.getFullYear());
            }
        });

        it("can handle ctor", () => {
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
                [Person.name, Person]
            ]);

            const result: any = mapper.fromObjectLiteral(
                testObject, typeInfo, types);

            assert.ok(result);
            assert.ok(result.me);
            assert.strictEqual(result.me.constructor.name, Person.name);
            assert.strictEqual(result.me.name, "Greg");
            assert.strictEqual(typeof result.me.sayHello, "function");
            assert.strictEqual(result.me.sayHello(), "Hello, I'm Greg.");
            assert.strictEqual(result.me.bornAt.getFullYear(), 1987);

            assert.strictEqual(result.people[0].constructor.name, Person.name);
            assert.strictEqual(result.people[0].name, "John");
            assert.strictEqual(result.people[0].sayHello(), "Hello, I'm John.");

            assert.strictEqual(result.people[1].name, "Samantha");
            assert.strictEqual(result.people[1].sayHello(), "Hello, I'm Samantha.");
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
            assert.strictEqual(typeof result.person.bornAt, "object");
            assert.ok(result.person.bornAt.getFullYear);
            assert.strictEqual(result.person.bornAt.getFullYear(), 1987);
        });

        it("can handle object literal descriptor", () => {
            const data = {
                animals: [
                    {
                        name: "Giraffe",
                        legsCount: 4
                    }
                ]
            };

            const typeInfo = {
                nestedTypes: {
                    "animals[]": "Animal"
                }
            };

            const typeDescriptorInstance = new AnimalTypeDescriptor();
            const types = new Map([[typeDescriptorInstance.name, typeDescriptorInstance]]);
            const result: any = mapper.fromObjectLiteral(
                data, typeInfo, types);
            assert.ok(result);
            assert.ok(result.animals);
            assert.ok(result.animals.length);

            const animal = result.animals[0];
            assert.strictEqual(animal.name, "Giraffe");
            assert.strictEqual(animal.legsCount, 4);
            assert.strictEqual(animal.run(), "Running Giraffe on 4 legs.");
        });

        it("can handle array of arrays", () => {
            const typeInfo = {
                nestedTypes: {
                    "characters[][]": "Person",
                    "characters[][].lastActedAt": "date"
                }
            };

            const data = {
                characters: [
                    [
                        {
                            name: "Jon",
                            lastActedAt: "2017-10-12T00:00:00.0000000"
                        },
                        {
                            name: "Bran",
                            lastActedAt: "2017-10-12T00:00:00.0000000"
                        }
                    ],
                    [
                        {
                            name: "Jaime",
                            lastActedAt: "2017-10-12T00:00:00.0000000"
                        },
                        {
                            name: "Tyrion",
                            lastActedAt: "2017-10-12T00:00:00.0000000"
                        },
                        {
                            name: "Cersei",
                            lastActedAt: "2017-10-12T00:00:00.0000000"
                        }
                    ]
                ]
            };

            const result: any = mapper.fromObjectLiteral(
                data, typeInfo, new Map([[Person.name, Person]]));

            assert.ok(result);
            assert.ok(result.characters);
            assert.ok(result.characters.length);

            assert.ok(result.characters[0]);
            assert.strictEqual(result.characters[0].length, 2);

            function assertArrayEntry(actual, expected) {
                assert.strictEqual(actual["name"], expected["name"]);
                assert.strictEqual(
                    actual["lastActedAt"].valueOf(), conventions.dateUtil.parse(expected["lastActedAt"]).valueOf());
            }

            for (let i = 0; i < result.characters[0].length; i++) {
                assertArrayEntry(result.characters[0][i], data.characters[0][i]);
            }

            for (let i = 0; i < result.characters[0].length; i++) {
                const c = result.characters[0][i];
                assert.strictEqual(typeof c.constructor, "function");
                assert.strictEqual(c.constructor, Person);
                assert.strictEqual(c.sayHello(), `Hello, I'm ${data.characters[0][i].name}.`);
                assert.strictEqual(typeof c.lastActedAt.getMonth, "function");
            }

            assert.ok(result.characters[1].length);
            assert.strictEqual(result.characters[1].length, 3);

            for (let i = 0; i < result.characters.length; i++) {
                assertArrayEntry(result.characters[1][i], data.characters[1][i]);
            }
        });

        it("should not fail if type's not found", () => {
            const typeInfo = {
                nestedTypes: {
                    "me": "MissingType",
                    "characters[]": "MissingType",
                    "characters[].lastActedAt": "date",
                }
            };

            const testObj = {
                me: { name: "Ash" },
                characters: [
                    { name: "Test", lastActedAt: null }
                ]
            };
            const result: any = mapper.fromObjectLiteral(testObj, typeInfo);
            assert.notStrictEqual(testObj, result);
            assert.strictEqual(result.me.name, "Ash");
            assert.strictEqual(result.characters.length, 1);
            assert.deepStrictEqual(result.characters, testObj.characters);
        });

        it("should not fail if field from nested types not found", () => {
            const typeInfo = {
                nestedTypes: {
                    "missingField": "Person",
                    "missingArray[]": "Person",
                    "characters[].missingFieldOnObjectInArray": "date",
                }
            };

            const testObj = {
                me: { name: "Ash" },
                characters: [
                    { name: "Test", lastActedAt: null }
                ]
            };
            const result: any = mapper.fromObjectLiteral(testObj, typeInfo, new Map([[Person.name, Person]]));
            assert.notStrictEqual(testObj, result);
            assert.strictEqual(result.me.name, "Ash");
            assert.strictEqual(result.characters.length, 1);
            assert.deepStrictEqual(result.characters, testObj.characters);
        });

        it("can handle Set", () => {

            const typeInfo = {
                nestedTypes: {
                    treeSpecies: "Set",
                    treeSpecies$SET: "Tree"
                }
            };

            const testObj = {
                treeSpecies: [
                    { name: "Oak" },
                    { name: "Birch" }
                ]
            };

            const result: any = mapper.fromObjectLiteral(testObj, typeInfo, new Map([[Tree.name, Tree]]));
            assert.ok(result);
            assert.ok(TypeUtil.isSet(result.treeSpecies));

            const resultSet = result.treeSpecies as Set<Tree>;
            for (const item of resultSet) {
                assert.strictEqual(item.constructor, Tree);
                assert.ok(testObj.treeSpecies
                    .map(x => x.name).some(x => x === item.name));
            }

            assert.strictEqual(resultSet.size, 2);
        });

        it("can handle Map with string keys", () => {
            const typeInfo = {
                nestedTypes: {
                    orders: "Map",
                    orders$MAP: "Order"
                }
            };

            const testObj = {
                orders: [
                    [
                        "John", 
                        {
                            orderId: 1,
                            isSent: false
                        }
                    ]
                ]
            };

            const result: any = mapper.fromObjectLiteral(testObj, typeInfo, new Map([[Order.name, Order]]));
            assert.ok(TypeUtil.isMap(result.orders));
            const ordersMap = result.orders as Map<string, any>;
            assert.strictEqual(ordersMap.size, 1);

            for (const entry of ordersMap) {
                const [name, order] = entry;
                const src = testObj.orders[0] && testObj.orders[0][1];
                assert.ok(src);
                assert.strictEqual(name, "John");
                assert.strictEqual(order.constructor, Order);
                assert.strictEqual(order.isSent, false);
                assert.strictEqual(order.orderId, 1);
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        it.skip("can handle map having objects for keys", () => {

        });
    });

    describe("toObjectLiteral()", function () {
        let typeInfo;
        let typeInfoCallback;

        beforeEach(() => {
            typeInfo = null;
            typeInfoCallback = (_typeInfo) => typeInfo = _typeInfo;
        });

        it("skips types from @metadata", () => {

            class Empty {}

            const testObject = {
                "test": new Date(),
                "@metadata": {
                    ignoredType: new Date(),
                    withClass: new Empty(),
                    inner: {
                        innerInner: new Empty()
                    }
                }
            };

            const result = mapper.toObjectLiteral(testObject, typeInfoCallback);
            const fields = Object.keys(typeInfo.nestedTypes);
            assert.strictEqual(fields.length, 1);
            assert.strictEqual(fields[0], "test");
        });

        it("can handle Date type", () => {

            const testObject = {
                lastModified: new Date(2018, 2, 14)
            };
            const result: any = mapper.toObjectLiteral(testObject, typeInfoCallback);
            const expectedTypeInfo = {
                typeName: null,
                nestedTypes: {
                    lastModified: "date"
                }
            };

            assert.deepStrictEqual(typeInfo, expectedTypeInfo);
            assert.strictEqual(typeof result.lastModified, "string");
            assert.strictEqual(result.lastModified, conventions.dateUtil.stringify(testObject.lastModified));
        });

        it("can handle array", () => {
            const testObject = {
                dates: [
                    new Date(2012, 10, 1),
                    new Date(2013, 2, 1)
                ]
            };
            const result: any = mapper.toObjectLiteral(testObject, typeInfoCallback);
            const expectedTypeInfo = {
                typeName: null,
                nestedTypes: {
                    "dates[]": "date"
                }
            };
            assert.deepStrictEqual(typeInfo, expectedTypeInfo);
            assert.strictEqual(typeof result.dates[0], "string");
            assert.strictEqual(result.dates[0], "2012-11-01T00:00:00.0000000");
            assert.strictEqual(result.dates.length, 2);
        });

        it("can handle top-level ctor", () => {
            const testObject = new Person("Maynard");
            const result: any = mapper.toObjectLiteral(testObject, typeInfoCallback);

            assert.ok(testObject !== result);
            // eslint-disable-next-line no-prototype-builtins
            assert.ok(!result.hasOwnProperty("sayHello"));
            assert.ok(typeInfo.typeName, Person.name);
            assert.deepStrictEqual(typeInfo.nestedTypes, {});
        });

        it("can handle properties of objects in array", () => {

            const testObject = {
                movies: [
                    new Movie("Matrix", new Date(1999, 5, 6)),
                    new Movie("Titanic", new Date(1998, 6, 7))
                ]
            };

            const types = new Map([[Movie.name, Movie]]);
            const result: any = mapper.toObjectLiteral(testObject, typeInfoCallback, types);

            const expectedTypeInfo = {
                typeName: null,
                nestedTypes: {
                    "movies[]": Movie.name,
                    "movies[].releasedAt": "date"
                }
            };

            assert.deepStrictEqual(expectedTypeInfo, typeInfo);
            assert.ok(testObject !== result);
            assert.strictEqual(result.movies.length, 2);
            assert.strictEqual(result.movies[0].constructor, Object);
            assert.strictEqual(typeof result.movies[0].releasedAt, "string");
            assert.strictEqual(result.movies[0].releasedAt, "1999-06-06T00:00:00.0000000");
        });

        it("can handle ctor for property and arrays", () => {
            const testObject = {
                me: Object.assign(new Person("Greg"), { bornAt: new Date(1987, 9, 12) }),
                people: [
                    new Person("John"),
                    new Person("Samantha")
                ]
            };

            const types = new Map([[Person.name, Person]]);
            const result: any = mapper.toObjectLiteral(testObject, typeInfoCallback, types);

            const expectedTypeInfo: TypeInfo = {
                typeName: null,
                nestedTypes: {
                    "me": "Person",
                    "me.bornAt": "date",
                    "people[]": "Person"
                }
            };
            assert.deepStrictEqual(typeInfo, expectedTypeInfo);
            assert.ok(result !== testObject);
            assert.strictEqual(result.me.constructor, Object);
            assert.strictEqual(result.me.bornAt, "1987-10-12T00:00:00.0000000");

            assert.strictEqual(result.people.length, 2);
            assert.strictEqual(result.people[0].constructor, Object);
            assert.strictEqual(result.people[0].name, "John");
            assert.strictEqual(result.people[1].constructor, Object);
            assert.strictEqual(result.people[1].name, "Samantha");
        });

        it("can handle dot operator", () => {
            const data = {
                person: {
                    bornAt: new Date(1987, 9, 12)
                }
            };

            const result: any = mapper.toObjectLiteral(data, typeInfoCallback);

            const expectedTypeInfo = {
                typeName: null,
                nestedTypes: {
                    "person.bornAt": "date"
                }
            };

            assert.deepStrictEqual(typeInfo, expectedTypeInfo);
            assert.strictEqual(result.person.bornAt, "1987-10-12T00:00:00.0000000");
        });

        it("can handle object literal descriptor", () => {
            const animalType = new AnimalTypeDescriptor();
            const data = {
                animals: [
                    animalType.construct({
                        name: "Giraffe",
                        legsCount: 4
                    })
                ]
            };

            const types = new Map([[animalType.name, animalType]]);
            const result: any = mapper.toObjectLiteral(data, typeInfoCallback, types);

            const expectedTypeInfo = {
                typeName: null,
                nestedTypes: {
                    "animals[]": animalType.name
                }
            };

            assert.ok(result);
            assert.strictEqual(result.animals.length, 1);
            assert.deepStrictEqual(typeInfo, expectedTypeInfo);
        });

        it("can handle Set", () => {
            const expectedArray = [
                { name: "Birch" },
                { name: "Oak" }
            ];

            const data = {
                trees: new Set([
                    new Tree("Birch"),
                    new Tree("Oak")
                ])
            };

            const result: any = mapper.toObjectLiteral(data, typeInfoCallback);
            assert.ok(Array.isArray(result.trees));
            assert.strictEqual(typeInfo.nestedTypes.trees, "Set");
            assert.strictEqual(typeInfo.nestedTypes.trees$SET, "Tree");
            assert.deepStrictEqual(result.trees, expectedArray);
        });

        it("can handle Map", () => {
            const expectedObj = [
                [ "Birch", { name: "Birch" } ],
                [ "Oak", { name: "Oak" } ]
            ];

            const data = {
                trees: new Map([
                    ["Birch", new Tree("Birch")],
                    ["Oak", new Tree("Oak")]
                ])
            };

            const result: any = mapper.toObjectLiteral(data, typeInfoCallback);
            assert.ok(TypeUtil.isArray(result.trees));
            assert.strictEqual(result.trees[0][0], "Birch");
            assert.strictEqual(result.trees[0][1].name, "Birch");
            assert.strictEqual(result.trees[1][0], "Oak");
            assert.strictEqual(result.trees[1][1].name, "Oak");

            assert.deepStrictEqual(result.trees, expectedObj);
            assert.strictEqual(typeInfo.nestedTypes.trees, "Map");
            assert.strictEqual(typeInfo.nestedTypes.trees$MAP, "Tree");
        });

        it("can handle array of arrays", () => {
            const newCharacter = (name: string) =>
                Object.assign(new Person(name), { lastActedAt: new Date(2017, 9, 12) });

            const data = {
                characters: [
                    [
                        newCharacter("Jon"),
                        newCharacter("Bran")
                    ],
                    [
                        newCharacter("Jaime"),
                        newCharacter("Tyrion"),
                        newCharacter("Cersei")
                    ]
                ]
            };

            const types = new Map([[Person.name, Person]]);
            const result: any = mapper.toObjectLiteral(data, typeInfoCallback, types);

            const expectedTypeInfo = {
                typeName: null,
                nestedTypes: {
                    "characters[][]": "Person",
                    "characters[][].lastActedAt": "date"
                }
            };

            assert.deepStrictEqual(typeInfo, expectedTypeInfo);
        });
    });
});
