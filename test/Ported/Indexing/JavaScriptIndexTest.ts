import * as assert from "assert";
import { testContext, disposeTestDocumentStore, storeNewDoc } from "../../Utils/TestUtil";

import {
    IDocumentStore, AbstractJavaScriptMultiMapIndexCreationTask, SpatialField,
} from "../../../src";
import { CONSTANTS } from "../../../src/Constants";
import { assertThat } from "../../Utils/AssertExtensions";
import { AbstractJavaScriptIndexCreationTask } from "../../../src/Documents/Indexes/AbstractJavaScriptIndexCreationTask";
import { CreatedField } from "../../../src/Documents/Indexes/StronglyTyped";

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

        class UsersByName extends AbstractJavaScriptIndexCreationTask<User> {
            public constructor() {
                super();
                this.map(User, u => ({ name: u.name, count: 1 }));
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
            const single = await session.query({ index: UsersByNameWithAdditionalSources })
                .whereEquals("name", "Mr. Brendan Eich")
                .selectFields("name")
                .single();
            assert.ok(single);
        }
    });

    it("canIndexArrayProperties", async () => {
        await store.executeIndex(new UsersByPhones());
        {
            const session = store.openSession();

            const user = new User();
            user.name = "Jow";
            user.phoneNumbers = [ "555-234-8765", "555-987-3425" ];
            await session.store(user);
            await session.saveChanges();

            await testContext.waitForIndexing(store);

            await session.query(UsersByPhonesResult, UsersByPhones)
                .whereEquals("phone", "555-234-8765")
                .ofType(User)
                .single();
        }
    });

    it("canIndexMapWithFanout", async () => {
        await store.executeIndex(new FanoutByNumbers());

        {
            const session = store.openSession();
            const f1 = new Fanout();
            f1.foo = "Foo";
            f1.numbers = [ 4, 6, 11, 9 ];

            await session.store(f1);

            const f2 = new Fanout();
            f2.foo = "Bar";
            f2.numbers = [ 3, 8, 5, 17 ];
            await session.store(f2);

            await session.saveChanges();

            await testContext.waitForIndexing(store);

            const result = await session.query(FanoutByNumbersResult, FanoutByNumbers)
                .whereEquals("sum", 17)
                .ofType(Fanout)
                .single();

            assertThat(result.foo)
                .isEqualTo("Bar");
        }
    });

    it("canIndexMapReduceWithFanoutWhenOutputingBlittableObjectInstance", async () => {
        await store.executeIndex(new FanoutByPaymentsWithReduce());

        {
            const session = store.openSession();

            const customer = new Customer();
            customer.name = "John Smidth";
            customer.status = "Active";
            customer.subscription = "Monthly";
            customer.payments = [
                new DateWithAmount("2018-09-01",58),
                new DateWithAmount("2018-10-01",48),
                new DateWithAmount("2018-11-01",75),
                new DateWithAmount("2018-12-01",42),
                new DateWithAmount("2019-01-01",34)
            ];

            await session.store(customer);

            await session.saveChanges();

            await testContext.waitForIndexing(store);

            const res = await session.query(DateWithAmount, FanoutByPaymentsWithReduce)
                .whereEquals("amount", 42.833333333333336)
                .all();

            assertThat(res)
                .hasSize(3);
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
            const result = await session.query({ index: FanoutByNumbersWithReduce })
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
                index: UsersByNameAndAnalyzedName
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

            await session.query({ index: UsersAndProductsByName })
                .whereEquals("name", "Brendan Eich")
                .single();
        }
    });

    it("canUseJavaScriptIndexWithLoadDocument", async () => {
        return canUseJavaScriptIndexWithLoadInternal(UsersWithProductsByName);
    });

    it("canUseJavaScriptIndexWithExternalLoadDocument", async () => {
        return canUseJavaScriptIndexWithLoadInternal(UsersWithProductsByNameWithExternalLoad);
    });

    async function canUseJavaScriptIndexWithLoadInternal(indexCtr: new () => AbstractJavaScriptIndexCreationTask<any>) {
        const index = new indexCtr();
        await store.executeIndex(index);

        {
            const session = store.openSession();
            const productId = "Products/1";

            const user = new User();
            user.name = "Brendan Eich";
            user.active = true;
            user.product = productId;

            await session.store(user);

            const product = new Product();
            product.name = "Shampoo";
            product.available = true;

            await session.store(product, productId);

            await session.saveChanges();

            await testContext.waitForIndexing(store);

            await session.query({
                documentType: User,
                index: indexCtr
            })
                .whereEquals("name", "Brendan Eich")
                .single();
        }
    }

    it("canUseJavaScriptMapReduceIndex", async function () {
        const index = new UsersAndProductsByNameAndCount();
        await store.executeIndex(index);

        {
            const session = store.openSession();
            await storeNewDoc(session, { name: "Brendan Eich" }, "users/1", User);   
            await storeNewDoc(session, { name: "Shampoo", available: true }, "products/1", Product);   
            await session.saveChanges();

            await testContext.waitForIndexing(store);
            const result = await session.query({ index: UsersAndProductsByNameAndCount })
                .whereEquals("name", "Brendan Eich")
                .single() as any;

            assert.strictEqual(result.count, 1);
            assert.strictEqual(result.name, "Brendan Eich");
        }
    });

    it("canUseSpatialFields", async () => {
        const kalab = 10;

        await store.executeIndex(new Spatial());
        await canUseSpatialFieldsInternal(kalab, store, "Spatial");
    });

    it("canUseDynamicSpatialFields", async () => {
        const kalab = 10;

        await store.executeIndex(new DynamicSpatial());
        await canUseSpatialFieldsInternal(kalab, store, "DynamicSpatial");
    });

    async function canUseSpatialFieldsInternal(kalab: number, store: IDocumentStore, indexName: string) {
        {
            const session = store.openSession();
            const l1 = new Location();
            l1.description = "Dor beach";
            l1.latitude = 32.61059534196809;
            l1.longitude = 34.918146686510454;

            await session.store(l1);

            const l2 = new Location();
            l2.description = "Kfar Galim";
            l2.latitude = 32.76724701152615;
            l2.longitude = 34.957999421620116;

            await session.store(l2);

            await session.saveChanges();

            await testContext.waitForIndexing(store);

            await session.query<SpatialResult>({
                indexName
            })
                .spatial("location", c => c.withinRadius(kalab, 32.56829122491778, 34.953954053921734))
                .whereEquals("description", "Dor beach")
                .ofType(Location)
                .single();
        }
    }

    it("canReduceNullValues", () => {
        return reduceNullValuesInternal(store);
    });

    async function reduceNullValuesInternal(store: IDocumentStore) {
        await store.executeIndex(new UsersReducedByName());

        {
            const session = store.openSession();

            const user1 = new User();
            user1.name = null;
            await session.store(user1);

            const user2 = new User();
            user2.name = null;
            await session.store(user2);

            const user3 = new User();
            user3.name = null;
            await session.store(user3);

            const user4 = new User();
            user4.name = "Tal";
            await session.store(user4);

            const user5 = new User();
            user5.name = "Maxim";
            await session.store(user5);

            await session.saveChanges();

            await testContext.waitForIndexing(store);

            const res = await session.query(User, UsersReducedByName)
                .ofType(ReduceResults)
                .whereEquals("count", 3)
                .single();
            assertThat(res.name)
                .isNull();
        }
    }

    it("canReduceWithReturnSyntax", async () => {
        await store.executeIndex(new UsersReducedByNameReturnSyntax());

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Tal";
            await session.store(user1);

            const user2 = new User();
            user2.name = "Tal";
            await session.store(user2);

            const user3 = new User();
            user3.name = "Maxim";
            await session.store(user3);

            await session.saveChanges();
            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();
            const res = await session.query(ReduceResults, UsersReducedByNameReturnSyntax)
                .whereEquals("count", 2)
                .single();

            assertThat(res.name)
                .isEqualTo("Tal");
        }
    });

    it("canUseJsIndexWithArrowObjectFunctionInMap", async () => {
        await store.executeIndex(new UsersByNameMapArrowSyntax());

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Tal";
            await session.store(user1);

            const user2 = new User();
            user2.name = "Tal";
            await session.store(user2);

            const user3 = new User();
            user3.name = "Maxim";
            await session.store(user3);

            await session.saveChanges();
            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();
            const res = await session.query(User, UsersByNameMapArrowSyntax)
                .whereEquals("name", "Maxim")
                .single();

            assertThat(res.name)
                .isEqualTo("Maxim");
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
            const res = await session.query({ index: ProductsByCategory })
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

    it("canQueryBySubObjectAsString", async () => {
        const address = new Address();
        address.line1 = "Home";
        address.line2 = "sweet home";

        await store.executeIndex(new Users_ByAddress());

        {
            const session = store.openSession();
            let user = new User();
            user.name = "Foo";
            user.address = address;

            await session.store(user);
            await session.saveChanges();

            await testContext.waitForIndexing(store);

            user = await session.query(User, Users_ByAddress)
                .whereEquals("address", address)
                .single();

            assertThat(user.name)
                .isEqualTo("Foo");
        }
    });

    it("canIndexSwitchCases", async () => {
        await store.executeIndex(new ProductsWarrenty());

        {
            const session = store.openSession();

            const p1 = new Product();
            p1.name = "p1";
            p1.mode = "Used";
            p1.manufacturer = "ACME";
            p1.type = 1;

            await session.store(p1);

            const p2 = new Product();
            p2.name = "p2";
            p2.mode = "Refurbished";
            p2.manufacturer = "ACME";
            p2.type = 1;

            await session.store(p2);

            const p3 = new Product();
            p3.name = "p3";
            p3.mode = "New";
            p3.manufacturer = "ACME";
            p3.type = 2;

            await session.store(p3);

            const p4 = new Product();
            p4.name = "p4";
            p4.mode = "New";
            p4.manufacturer = "EMCA";
            p4.type = 2;

            await session.store(p4);

            const p5 = new Product();
            p5.name = "p5";
            p5.mode = "Refurbished";
            p5.manufacturer = "EMCA";
            p5.type = 2;

            await session.store(p5);

            await session.saveChanges();

            await testContext.waitForIndexing(store);

            const res = await session.query(ProductsWarrentyResult, ProductsWarrenty)
                .whereGreaterThan("duration", 20)
                .ofType(Product)
                .single();
            assertThat(res.name)
                .isEqualTo("p3");
        }
    });
});

class Customer {
    public name: string;
    public status: string;
    public subscription: string;
    public payments: DateWithAmount[];
}

class DateWithAmount {

    public date: string;
    public amount: number;

    public constructor(date: string, amount: number) {
        this.date = date;
        this.amount = amount;
    }
}

type FanoutByPaymentsWithReduceResult = { date: string, amount: number };

class FanoutByPaymentsWithReduce extends AbstractJavaScriptIndexCreationTask<Customer, FanoutByPaymentsWithReduceResult> {

    public constructor() {
        super();

        this.map(Customer, cust => {
            const length = cust.payments.length;

            if (!length) {
                return undefined; //nothing to work on
            }

            const res: FanoutByPaymentsWithReduceResult[] = [];

            const lastPayment = new Date(cust.payments[length - 1].date);

            for (let t = 0; t < 3; t++) {
                let sum = 0;
                let i: number;
                for (i = 1; i <= length; i++) {
                    sum += cust.payments[length - i].amount;
                }

                if (cust.subscription === "Monthly") {
                    lastPayment.setMonth(lastPayment.getMonth() + 1);
                } else {
                    lastPayment.setFullYear(lastPayment.getFullYear() + 1);
                }

                res.push({
                    amount: sum / i,
                    date: lastPayment.toISOString().substr(0, 10)
                });
            }
            return res;
        });

        this.reduce(results => results
            .groupBy(x => x.date)
            .aggregate(g => {
                return {
                    date: g.key,
                    amount: g.values.reduce((c, v) => c + v.amount, 0)
                }
            }));
    }
}

class User {
    public name: string;
    public active: boolean;
    public product: string;
    public phoneNumbers: string[];
    public address: Address;
}

class Address {
    public line1: string;
    public line2: string;
}

class Location {
    public description: string;
    public longitude: number;
    public latitude: number;
}

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
    public category: string;
    public pricePerUnit: number;
    public mode: string;
    public type: number;
    public manufacturer: string;
}

class ReduceResults {
    public name: string;
    public count: number;
}

class UsersByNameWithAdditionalSources extends AbstractJavaScriptIndexCreationTask<User, Pick<User, "name">> {
    public constructor() {
        super();

        const mr = function mr(x: string) {
            return "Mr. " + x;
        }

        this.map(User, x => {
            return {
                name: mr(x.name)
            }
        });

        this.addSource("The Script", mr);
    }
}

class FanoutByNumbersResult {
    public foo: string;
    public sum: number;
}
class FanoutByNumbers extends AbstractJavaScriptIndexCreationTask<Fanout> {
    public constructor() {
        super();

        this.map(Fanout, f => {
            const result: FanoutByNumbersResult[] = [];
            for (let i = 0; i < f.numbers.length; i++) {
                result.push({
                    foo: f.foo,
                    sum: f.numbers[i]
                });
            }
            return result;
        })
    }
}

interface FanoutByNumbersWithReduceResult {
    foo: string;
    sum: number;
}

class FanoutByNumbersWithReduce extends AbstractJavaScriptIndexCreationTask<Fanout, FanoutByNumbersWithReduceResult> {
    public constructor() {
        super();

        this.map(Fanout, f => {
            const result: FanoutByNumbersWithReduceResult[] = [];
            for (let i = 0; i < f.numbers.length; i++) {
                result.push({
                    foo: f.foo,
                    sum: f.numbers[i]
                });
            }
            return result;
        });

        this.reduce(r => r.groupBy(x => x.foo).aggregate(g => ({
            foo: g.key,
            sum: g.values.reduce((total, val) => val.sum + total, 0)
        })));
    }
}

class UsersByPhonesResult {
    public name: string;
    public phone: string[];
}

class UsersByPhones extends AbstractJavaScriptIndexCreationTask<User, UsersByPhonesResult> {
    public constructor() {
        super();

        this.map(User, u => {
            return {
                name: u.name,
                phone: u.phoneNumbers
            }
        });
    }
}

class UsersByNameAndAnalyzedNameResult {
    public analyzedName: string;
}
class UsersByNameAndAnalyzedName extends AbstractJavaScriptIndexCreationTask<User> {
    public constructor() {
        super();

        this.map(User, u => {
            return {
                name: u.name,
                _: {
                    $value: u.name,
                    $name: "analyzedName",
                    $options: {
                        indexing: "Search",
                        storage: true
                    }
                } as CreatedField
            }
        });

        this.index(CONSTANTS.Documents.Indexing.Fields.ALL_FIELDS, "Search");
        this.analyze(CONSTANTS.Documents.Indexing.Fields.ALL_FIELDS, "StandardAnalyzer");
    }
}

class UsersAndProductsByName extends AbstractJavaScriptMultiMapIndexCreationTask<{ name: string, count: number }> {
    public constructor() {
        super();
        this.map(User, u => {
            return {
                name: u.name,
                count: 1
            }
        });

        this.map(Product, p => {
            return {
                name: p.name,
                count: 1
            }
        });
    }
}

class UsersWithProductsByName extends AbstractJavaScriptIndexCreationTask<User, { name: string, count: number, product: string }> {
    public constructor() {
        super();

        const { load } = this.mapUtils();

        this.map(User, u => {
            return {
                name: u.name,
                count: 1,
                product: load(u.product, "Products").name
            }
        });
    }
}

class UsersWithProductsByNameWithExternalLoad extends AbstractJavaScriptIndexCreationTask<User, { name: string, count: number, product: string }> {
    constructor() {
        super();

        const { load } = this.mapUtils();

        function getProductName(u: User) {
            return load(u.product, "Products").name;
        }

        this.map(User, u => {
            return {
                name: u.name,
                count: 1,
                product: getProductName(u)
            }
        });

        this.addSource(getProductName);
    }
}

class ProductsWarrenty extends AbstractJavaScriptIndexCreationTask<Product, ProductsWarrentyResult> {
    public constructor() {
        super();

        this.map(Product, prod => {
            const result: ProductsWarrentyResult = { warranty: "parts", duration: 1 };

            if (prod.mode === "Used") {
                return result;
            }

            switch (prod.type) {
                case 1:
                    return null;
            }

            if (prod.manufacturer === "ACME") {
                // out product
                result.warranty = "Full";
                result.duration = 24;
            } else {
                // 3rd party
                result.warranty = "Parts";
                result.duration = 6;
            }

            if (prod.mode === "Refurbished") {
                result.duration /= 2;
            }

            return result;
        });
    }
}


type SpatialResult = { description: string, location: SpatialField };

class Spatial extends AbstractJavaScriptIndexCreationTask<Location, SpatialResult> {
    public constructor() {
        super();

        const { createSpatialField } = this.mapUtils();

        this.map(Location, l => {
            return {
                description: l.description,
                location: createSpatialField(l.latitude, l.longitude)
            }
        });
    }
}

class DynamicSpatial extends AbstractJavaScriptIndexCreationTask<Location> {
    public constructor() {
        super();

        const { createSpatialField } = this.mapUtils();

        this.map(Location, l => {
            return {
                description: l.description,
                _ : {
                    $value: createSpatialField(l.latitude, l.longitude),
                    $name: "location",
                    $options: {
                        indexing: "Search",
                        storage: true
                    }
                } as CreatedField
            }
        })
    }
}

class UsersAndProductsByNameAndCount extends AbstractJavaScriptMultiMapIndexCreationTask<{ name: string, count: number }> {
    public constructor() {
        super();

        this.map(User, u => {
            return {
                name: u.name,
                count: 1
            }
        });

        this.map(Product, p => {
            return {
                name: p.name,
                count: 1
            }
        });

        this.reduce(results => results
            .groupBy(x => x.name)
            .aggregate(g => {
                return {
                    name: g.key,
                    count: g.values.reduce((total, val) => val.count + total, 0)
                }
            }));
    }
}

class UsersReducedByName extends AbstractJavaScriptIndexCreationTask<User, ReduceResults> {
    public constructor() {
        super();

        this.map(User, function (u: User) {
            return {
                name: u.name,
                count: 1
            }
        });

        this.reduce(result => result.groupBy(x => x.name).aggregate(g => {
            return {
                name: g.key,
                count: g.values.reduce((total, val) => val.count + total, 0)
            }
        }));
    }
}

class UsersReducedByNameReturnSyntax extends AbstractJavaScriptIndexCreationTask<User, ReduceResults> {
    public constructor() {
        super();

        this.map(User, function (u: User) {
            return {
                name: u.name,
                count: 1
            }
        });

        this.reduce(result => result.groupBy(x => {
            return {
                name: x.name
            }
        }).aggregate(g => {
            return {
                name: g.key.name,
                count: g.values.reduce((total, val) => val.count + total, 0)
            }
        }));
    }
}

class UsersByNameMapArrowSyntax extends AbstractJavaScriptIndexCreationTask<User> {
    public constructor() {
        super();

        // using arrow function w/o explicit return statement

        this.map(User, u => ({ name: u.name }));
    }
}

interface ProductsByCategoryResult {
    category: string;
    count: number;
}

class ProductsByCategory extends AbstractJavaScriptIndexCreationTask<Product2, { category: string, count: number }> {
    public constructor() {
        super();

        const { load } = this.mapUtils();

        this.map(Product2, p => {
            return {
                category: load<Category>(p.category, "categories").name,
                count: 1
            }
        });

        this.reduce(r => r.groupBy(x => x.category)
            .aggregate(g => {
                return {
                    category: g.key,
                    count: g.values.reduce((count, val) => val.count + count, 0)
                }
            })
        );

        this.outputReduceToCollection = "CategoryCounts";
    }
}
class Fanout {
    public foo: string;
    public numbers: number[];
}

class Users_ByAddress extends AbstractJavaScriptIndexCreationTask<User, Pick<User, "address">> {
    public constructor() {
        super();

        this.map(User, function (u: User) {
            return {
                address: u.address
            }
        });
    }
}

class ProductsWarrentyResult {
    public warranty: string;
    public duration: number;
}