import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore, storeNewDoc } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    AbstractJavaScriptIndexCreationTask,
    IndexFieldOptions,
} from "../../../src";
import { CONSTANTS } from "../../../src/Constants";
import { User } from "../../Assets/Entities";

interface Category {
    description: string;
    name: string;
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

interface Product {
    name: string;
    available: boolean;
}

class UsersByNameWithAdditionalSources extends AbstractJavaScriptIndexCreationTask {
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
class FanoutByNumbersWithReduce extends AbstractJavaScriptIndexCreationTask {
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

interface UsersByNameAndAnalyzedNameResult {
    analyzedName: string;
}
class UsersByNameAndAnalyzedName extends AbstractJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set([`map('Users', function (u){
                                    return {
                                        Name: u.Name,
                                        _: {$value: u.Name, $name:'AnalyzedName', $options:{ index: true, store: true }}
                                    };
                                })`]);

        const fieldOptions = this.fields = {};
        const indexFieldOptions = new IndexFieldOptions();
        indexFieldOptions.indexing = "Search";
        indexFieldOptions.analyzer = "StandardAnalyzer";
        fieldOptions[CONSTANTS.Documents.Indexing.Fields.ALL_FIELDS] = indexFieldOptions;
    }
}

class UsersAndProductsByName extends AbstractJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set([
            "map('Users', function (u){ return { name: u.name, count: 1};})",
            "map('Products', function (p){ return { name: p.name, count: 1};})"
        ]);
    }
}

class UsersAndProductsByNameAndCount extends AbstractJavaScriptIndexCreationTask {
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

class ProductsByCategory extends AbstractJavaScriptIndexCreationTask {
    public constructor() {
        super();
        this.maps = new Set(["map('products', function(p){\n" +
            "                        return {\n" +
            "                            category:\n" +
            "                            load(p.category, 'Categories').name,\n" +
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

        class UsersByName extends AbstractJavaScriptIndexCreationTask {
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
                .single();
            assert.ok(single);
        }

    });

    it("canIndexMapReduceWithFanout", async function () {
        const index = new FanoutByNumbersWithReduce();
        await store.executeIndex(index);
        {
            const session = store.openSession();
            storeNewDoc(session, { foo: "Foo", numbers: [ 4, 6, 11, 9 ] }, null, Fanout);
            storeNewDoc(session, { foo: "Foo", numbers: [ 3, 8, 5, 17 ] }, null, Fanout);
            session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const result = await session.query({ indexName: index.getIndexName() })
                .whereEquals("sum", 33)
                .single();
            
            assert.ok(result);
        }
    });
});

// @Test
//     public void () throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new FanoutByNumbersWithReduce());

//             try (IDocumentSession session = store.openSession()) {
//                 Fanout fanout1 = new Fanout();
//                 fanout1.setFoo("Foo");
//                 fanout1.setNumbers(new int[] { 4, 6, 11, 9 });

//                 Fanout fanout2 = new Fanout();
//                 fanout2.setFoo("Bar");
//                 fanout2.setNumbers(new int[] { 3, 8, 5, 17 });

//                 session.store(fanout1);
//                 session.store(fanout2);
//                 session.saveChanges();

//                 waitForIndexing(store);

//                 session.query(FanoutByNumbersWithReduce.Result.class, index("FanoutByNumbersWithReduce"))
//                         .whereEquals("sum", 33)
//                         .single();

//             }
//         }
//     }

//     @Test
//     public void canUseJavaScriptIndexWithDynamicFields() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersByNameAndAnalyzedName());

//             try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                 session.store(user);
//                 session.saveChanges();

//                 waitForIndexing(store);

//                 session.query(User.class, index("UsersByNameAndAnalyzedName"))
//                         .ofType(UsersByNameAndAnalyzedName.Result.class)
//                         .search("analyzedName", "Brendan")
//                         .single();
//             }
//         }
//     }

//     @Test
//     public void canUseJavaScriptMultiMapIndex() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersAndProductsByName());

//             try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                 session.store(user);

//                 Product product = new Product();
//                 product.setName("Shampoo");
//                 product.setAvailable(true);
//                 session.store(product);

//                 session.saveChanges();

//                 waitForIndexing(store);

//                 session.query(User.class, index("UsersAndProductsByName"))
//                         .whereEquals("name", "Brendan Eich")
//                         .single();
//             }
//         }
//     }

//     @Test
//     public void canUseJavaScriptMapReduceIndex() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersAndProductsByNameAndCount());

//             try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Brendan Eich");
//                 session.store(user);

//                 Product product = new Product();
//                 product.setName("Shampoo");
//                 product.setAvailable(true);
//                 session.store(product);

//                 session.saveChanges();

//                 waitForIndexing(store);

//                 session.query(User.class, index("UsersAndProductsByNameAndCount"))
//                         .whereEquals("name", "Brendan Eich")
//                         .single();
//             }
//         }
//     }

//     @Test
//     public void outputReduceToCollection() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new Products_ByCategory());

//             try (IDocumentSession session = store.openSession()) {
//                 Category category1 = new Category();
//                 category1.setName("Beverages");
//                 session.store(category1, "categories/1-A");

//                 Category category2 = new Category();
//                 category2.setName("Seafood");
//                 session.store(category2, "categories/2-A");

//                 session.store(Product2.create("categories/1-A", "Lakkalikööri", 13));
//                 session.store(Product2.create("categories/1-A", "Original Frankfurter", 16));
//                 session.store(Product2.create("categories/2-A", "Röd Kaviar", 18));

//                 session.saveChanges();

//                 waitForIndexing(store);

//                 List<Products_ByCategory.Result> res = session.query(Products_ByCategory.Result.class, index("Products/ByCategory"))
//                         .toList();

//                 List<CategoryCount> res2 = session.query(CategoryCount.class)
//                         .toList();

//                 assertThat(res2.size())
//                         .isEqualTo(res.size());
//             }
//         }
//     }