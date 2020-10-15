import * as assert from "assert";
import { testContext, disposeTestDocumentStore, storeNewDoc } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractRawJavaScriptIndexCreationTask,
    IndexFieldOptions,
} from "../../../src";
import { CONSTANTS } from "../../../src/Constants";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

class Category {
    public description: string;
    public name: string;
}

class Product2 {
    public category: string;
    public name: string;
    public pricePerUnit: number;

    public static create(category: string, name: string, pricePerUnit: number): Product2 {
        return Object.assign(new Product2(), {
            category, name, pricePerUnit
        });
    }
}
interface CategoryCount {
    category: string;
    count: number;
}

class Product {
    public name: string;
    public available: boolean;
}

class UsersByNameWithAdditionalSources extends AbstractRawJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set(["map('Users', function(u) { return { name: mr(u.name)}; })"]);
        this.additionalSources = { "The Script": "function mr(x) { return 'Mr. ' + x; }" };
    }
}

interface FanoutByNumbersWithReduceResult {
    foo: string;
    sum: number;
}
class FanoutByNumbersWithReduce extends AbstractRawJavaScriptIndexCreationTask {
        public constructor() {
            super();
            this.maps = new Set([
                `map('Fanouts', function (f) {
                        var result = [];
                        for(var i = 0; i < f.numbers.length; i++)
                        {
                            result.push({
                                foo: f.foo,
                                sum: f.numbers[i]
                            });
                        }
                        return result;
                        })`]);
            this.reduce =
                `groupBy(f => f.foo)
                    .aggregate(g => ({  
                        foo: g.key, 
                        sum: g.values.reduce((total, val) => 
                            val.sum + total,0) 
                    }))`;
        }
    }

class UsersByNameAndAnalyzedNameResult {
    public analyzedName: string;
}
class UsersByNameAndAnalyzedName extends AbstractRawJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set([`map('Users', function (u){
                                    return {
                                        name: u.name,
                                        _: {
                                            $value: u.name, 
                                            $name:'analyzedName', 
                                            $options:{ indexing: 'Search', storage: true }
                                        }
                                    };
                                })`]);

        const fieldOptions = this.fields = {};
        const indexFieldOptions = new IndexFieldOptions();
        indexFieldOptions.indexing = "Search";
        indexFieldOptions.analyzer = "StandardAnalyzer";
        fieldOptions[CONSTANTS.Documents.Indexing.Fields.ALL_FIELDS] = indexFieldOptions;
    }
}

class UsersAndProductsByName extends AbstractRawJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set([
            "map('Users', function (u) { return { name: u.name, count: 1}; })",
            "map('Products', function (p) { return { name: p.name, count: 1}; })"
        ]);
    }
}

class UsersAndProductsByNameAndCount extends AbstractRawJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set([
            "map('Users', function (u){ return { name: u.name, count: 1};})",
            "map('Products', function (p){ return { name: p.name, count: 1};})"
        ]);
        this.reduce = `groupBy(x => x.name)
                            .aggregate(g => {
                                return {
                                    name: g.key,
                                    count: g.values.reduce((total, val) => val.count + total,0)
                                };
                        })`;
    }
}

interface ProductsByCategoryResult {
    category: string;
    count: number;
}

class ProductsByCategory extends AbstractRawJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set(["map('product2s', function(p){\n" +
            "                        return {\n" +
            "                            category:\n" +
                "                            load(p.category, 'categories').name,\n" +
            "                            count:\n" +
                "                            1\n" +
            "                        }\n" +
            "                    })"]);
        this.reduce = "groupBy( x => x.category )\n" +
            "                            .aggregate(g => {\n" +
            "                                return {\n" +
            "                                    category: g.key,\n" +
            "                                    count: g.values.reduce((count, val) => val.count + count, 0)\n" +
            "                               };})";
        this.outputReduceToCollection = "CategoryCounts";
    }
}
class Fanout {
    public foo: string;
    public numbers: number[];
}

describe("JavaScriptIndexTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    async function storeBrendan(store) {
        const session = store.openSession();
        const user = Object.assign(new User(), { name: "Brendan Eich" });
        await session.store(user);
        await session.saveChanges();
    }

    it("canUseJavaScriptIndex", async () => {

        class UsersByName extends AbstractRawJavaScriptIndexCreationTask {
            public constructor() {
                super();
                this.maps = new Set(["map('Users', u => ({ name: u.name, count: 1 }))"]);
            }
        }
            
        await store.executeIndex(new UsersByName());
        await storeBrendan(store);
        await testContext.waitForIndexing(store);
        {
            const session = store.openSession();
            const single = await session.query({ collection: "users" })
                .whereEquals("name", "Brendan Eich")
                .single();
            assert.ok(single);
        }
    });

    it("canUseJavaScriptIndexWithAdditionalSources", async function () {
        const index = new UsersByNameWithAdditionalSources();
        await store.executeIndex(index);
        await storeBrendan(store);
        await testContext.waitForIndexing(store);
        {
            const session = store.openSession();
            const single = await session.query({ indexName: index.getIndexName() })
                .whereEquals("name", "Mr. Brendan Eich")
                .selectFields("name")
                .single();
            assert.ok(single);
        }

    });

    it("canIndexMapReduceWithFanout", async function () {
        const index = new FanoutByNumbersWithReduce();
        await store.executeIndex(index);
        {
            const session = store.openSession();
            await storeNewDoc(session, { foo: "Foo", numbers: [ 4, 6, 11, 9 ] }, null, Fanout);
            await storeNewDoc(session, { foo: "Bar", numbers: [ 3, 8, 5, 17 ] }, null, Fanout);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const result = await session.query({ indexName: index.getIndexName() })
                .whereEquals("sum", 33)
                .selectFields("sum")
                .single();
            
            assert.ok(result);
        }
    });

    it("canUseJavaScriptIndexWithDynamicFields", async function () {
        const index = new UsersByNameAndAnalyzedName();
        await store.executeIndex(index);

        await storeBrendan(store);
        await testContext.waitForIndexing(store);
        {
            const session = store.openSession();
            const result = await session.query({ 
                indexName: index.getIndexName()
            })
            .search("analyzedName", "Brendan")
            .selectFields<UsersByNameAndAnalyzedNameResult>("analyzedName", UsersByNameAndAnalyzedNameResult)
            .single();
            
            assert.ok(result);
            assert.strictEqual(result.analyzedName, "Brendan Eich");
        }
    });

    it("canUseJavaScriptMultiMapIndex", async function () {
        const index = new UsersAndProductsByName();
        await store.executeIndex(index);
        {
            const session = store.openSession();
            await storeNewDoc(session, { name: "Brendan Eich" }, "users/1", User);   
            await storeNewDoc(session, { name: "Shampoo", available: true }, "products/1", Product);   
            await session.saveChanges();

            await testContext.waitForIndexing(store);

            await session.query({ indexName: "UsersAndProductsByName" })
                .whereEquals("name", "Brendan Eich")
                .single();
        }

    });

    it("canUseJavaScriptMapReduceIndex", async function () {
        const index = new UsersAndProductsByNameAndCount();
        await store.executeIndex(index);

        {
            const session = store.openSession();
            await storeNewDoc(session, { name: "Brendan Eich" }, "users/1", User);   
            await storeNewDoc(session, { name: "Shampoo", available: true }, "products/1", Product);   
            await session.saveChanges();

            await testContext.waitForIndexing(store);
            const result = await session.query({ indexName: index.getIndexName() })
                .whereEquals("name", "Brendan Eich")
                .single() as any;

            assert.strictEqual(result.count, 1);
            assert.strictEqual(result.name, "Brendan Eich");
        }
    });

    it("outputReduceToCollection", async function () {
        const index = new ProductsByCategory();
        await store.executeIndex(index);
        {
            const session = store.openSession();
            await storeNewDoc(session, { name: "Beverages" }, "categories/1-A", Category);   
            await storeNewDoc(session, { name: "Seafood" }, "categories/2-A", Category);   
            await session.store(Product2.create("categories/1-A", "Lakkalikööri", 13));
            await session.store(Product2.create("categories/1-A", "Original Frankfurter", 16));
            await session.store(Product2.create("categories/2-A", "Röd Kaviar", 18));
            await session.saveChanges();

            await testContext.waitForIndexing(store);
            const res = await session.query({ indexName: index.getIndexName() })
                .all();

            const res2 = await session.query({ collection: "CategoryCounts" })
                .all();

            assert.ok(res.length && res2.length);
            assertThat(res2.length)
                .isEqualTo(res.length);
            assertThat(res2.length)
                .isGreaterThan(0);
            assertThat(res.length)
                .isGreaterThan(0);
        }

    });
});