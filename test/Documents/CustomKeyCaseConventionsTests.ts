import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import * as assert from "assert";
import DocumentStore, {
    IDocumentStore, PatchCommandData, PatchRequest,
} from "../../src";
import { assertThat } from "../Utils/AssertExtensions";

describe("With custom key case conventions set", function () {

    let regularStore: IDocumentStore;

    beforeEach(async function () {
        regularStore = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(regularStore));

    function getStoreWithCustomConventions(setupStore: (store: DocumentStore) => void) {
        const customStore = new DocumentStore(regularStore.urls, regularStore.database);
        setupStore(customStore);
        customStore.initialize();
        return customStore;
    }

    let pascalCasedObj;
    let pascalCasedIncludeObj;
    let camelCasedObj;
    let camelCasedIncludeObj;

    let pascalCasedCmpXchObj;
    let camelCasedCmpXchObj;

    beforeEach(() => {
        pascalCasedObj = {
            Name: "John",
            Age: 25,
            Skill: "skills/1",
            Email: "cmp/1",
            Equipment: [
                {
                    Name: "Headphones",
                    ForSale: false
                },
                {
                    Name: "Baseball Cap",
                    ForSale: false
                },
                {
                    Name: "Stamps",
                    ForSale: true
                }
            ],
            RegisteredAt: new Date(1988, 10, 12),
            Collection: "People"
        };

        pascalCasedObj["@metadata"] = {
            "@collection": "People",
            "CustomField": "Pascal"
        };

        pascalCasedIncludeObj = {
            Name: "Java"
        };

        pascalCasedIncludeObj["@metadata"] = {
            "@collection": "Skills",
            "CustomSkill": "Meta"
        }

        camelCasedObj = {
            name: "John",
            age: 25,
            skill: "skills/1",
            email: "cmp/1",
            equipment: [
                {
                    name: "Headphones",
                    forSale: false
                },
                {
                    name: "Baseball Cap",
                    forSale: false
                },
                {
                    name: "Stamps",
                    forSale: true
                }
            ],
            registeredAt: new Date(1988, 10, 12),
            collection: "People"
        };

        camelCasedObj["@metadata"] = {
            "@collection": "People",
            "customField": "Pascal"
        };

        camelCasedIncludeObj = {
            name: "Java"
        };

        camelCasedIncludeObj["@metadata"] = {
            "@collection": "Skills",
            "customSkill": "Meta"
        }

        pascalCasedCmpXchObj = {
            Email: "test@example.com"
        }

        camelCasedCmpXchObj = {
            email: "test@example.com"
        }
    });

    it("loads PascalCased entities as camelCased", async () => {
        {
            const session = regularStore.openSession();
            await session.store(pascalCasedObj);
            await session.store(pascalCasedIncludeObj, "skills/1");
            await session.saveChanges();
        }

        let store: DocumentStore;
        try {
            store = getStoreWithCustomConventions((s) => {
                s.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
                s.conventions.entityFieldNameConvention = "camel";
                s.conventions.remoteEntityFieldNameConvention = "pascal";
                s.conventions.identityProperty = "Id";
                s.conventions.registerEntityIdPropertyName(Object, "Id");
            });

            const docId = pascalCasedObj["id"];

            assert.ok(docId);

            {
                const session = store.openSession();
                const loaded: any = await session.include("Skill").load(pascalCasedObj["id"])
                assert.ok(loaded);
                assert.ok(loaded["@metadata"]);
                assert.strictEqual(loaded["@metadata"]["@nested-object-types"]["RegisteredAt"], "date");
                assert.strictEqual(loaded.name, pascalCasedObj.Name);
                assert.strictEqual(loaded.age, pascalCasedObj.Age);
                assert.strictEqual(loaded.registeredAt.constructor, Date);
                assert.strictEqual(loaded.registeredAt.valueOf(), pascalCasedObj.RegisteredAt.valueOf());
                assert.strictEqual(loaded["@metadata"]["@collection"], pascalCasedObj.Collection);
                assert.strictEqual(loaded["@metadata"]["customSkill"], camelCasedObj["@metadata"]["customSkill"]);
                assert.strictEqual(loaded.collection, pascalCasedObj.Collection);
                assert.strictEqual(loaded.equipment[0].name, pascalCasedObj.Equipment[0].Name);


                const included: any = await session.load("skills/1");
                assert.strictEqual(included.name, pascalCasedIncludeObj.Name);

                assert.ok(included["@metadata"]);
                assert.strictEqual(included["@metadata"]["customSkill"], camelCasedIncludeObj["@metadata"].customSkill);

                assertThat(session.advanced.numberOfRequests)
                    .isEqualTo(1);
            }

        } finally {
            if (store) {
                store.dispose();
            }
        }

    });

    it("stores camelCased entities as PascalCased", async () => {
        let customCaseStore;
        const stored = camelCasedObj;
        try {
            customCaseStore = getStoreWithCustomConventions((s) => {
                s.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
                s.conventions.entityFieldNameConvention = "camel";
                s.conventions.remoteEntityFieldNameConvention = "pascal";
                s.conventions.identityProperty = "Id";
                s.conventions.registerEntityIdPropertyName(Object, "Id");
            });

            {
                const session = customCaseStore.openSession();
                await session.store(camelCasedObj, "people/1");
                await session.store(pascalCasedIncludeObj, "skills/1");
                await session.saveChanges();
            }

        } finally {
            if (customCaseStore) {
                customCaseStore.dispose();
            }
        }

        {
            const session = regularStore.openSession();
            const loaded: any = await session.load("people/1");
            assert.ok(loaded);
            assert.strictEqual(loaded.Name, stored.name);
            assert.strictEqual(loaded.Age, stored.age);
            assert.ok(loaded.RegisteredAt);
            assert.strictEqual(loaded.RegisteredAt.constructor, Date, `Got ${ loaded.registeredAt } - not a Date`);

            assert.strictEqual(loaded.RegisteredAt.valueOf(), stored.registeredAt.valueOf());

            assert.strictEqual(loaded.Collection, stored.collection);
            assert.strictEqual(loaded.Equipment[0].Name, stored.equipment[0].name);

            assert.ok(loaded["@metadata"]);
            assert.strictEqual(loaded["@metadata"]["@collection"], stored.collection);
            assert.strictEqual(loaded["@metadata"]["@nested-object-types"]["RegisteredAt"], "date");
        }

    });

    it("should throw error if only one key case convention is set", async () => {
        try {
            getStoreWithCustomConventions(store => {
                store.conventions.remoteEntityFieldNameConvention = "dot";
            });
            assert.fail("should have thrown");
        } catch (err) {
            assert.ok(err.message !== "should have thrown");
        }
    });

    it("query pascal cased stuff, retrieving camel case", async () => {
        {
            const session = regularStore.openSession({
                transactionMode: "ClusterWide"
            });
            await session.store(pascalCasedObj, "people/1");
            await session.store(pascalCasedIncludeObj, "skills/1");
            await session.advanced.clusterTransaction.createCompareExchangeValue("cmp/1", pascalCasedCmpXchObj);
            await session.saveChanges();
        }

        let store: DocumentStore;
        try {
            store = getStoreWithCustomConventions((s) => {
                s.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
                s.conventions.entityFieldNameConvention = "camel";
                s.conventions.remoteEntityFieldNameConvention = "pascal";
                s.conventions.identityProperty = "Id";
                s.conventions.registerEntityIdPropertyName(Object, "Id");
            });

            const session = store.openSession({
                transactionMode: "ClusterWide"
            });
            const queryResults = await session.query({
                collection: "People"
            })
                .whereEquals("Name", "John")
                .include(x => {
                    x.includeDocuments("Skill");
                    x.includeCompareExchangeValue("Email");
                })
                .all();

            assert.ok(queryResults.length);
            const result: any = queryResults[0];
            assert.strictEqual(result.name, pascalCasedObj.Name);
            assert.strictEqual(result.age, pascalCasedObj.Age);

            const included: any = await session.load("skills/1");
            assert.strictEqual(included.name, pascalCasedIncludeObj.Name);


            const cmp = await session.advanced.clusterTransaction.getCompareExchangeValue<typeof pascalCasedCmpXchObj>("cmp/1");
            // we don't transform casing for cmpXchValues
            assert.strictEqual(cmp.value.email, pascalCasedCmpXchObj.Email);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        } finally {
            if (store) {
                store.dispose();
            }
        }

    });

    it("query pascal cased stuff, retrieving camel case with projection", async () => {
        {
            const session = regularStore.openSession();
            await session.store(pascalCasedObj);
            await session.saveChanges();
        }

        let store: DocumentStore;
        try {
            store = getStoreWithCustomConventions((s) => {
                s.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
                s.conventions.entityFieldNameConvention = "camel";
                s.conventions.remoteEntityFieldNameConvention = "pascal";
                s.conventions.identityProperty = "Id";
                s.conventions.registerEntityIdPropertyName(Object, "Id");
            });

            const session = store.openSession();

            // just one field
            let queryResults = await session.query({
                collection: "People"
            })
                .whereEquals("Name", "John")
                .selectFields("Name")
                .all();

            assert.ok(queryResults.length);
            let result: any = queryResults[0];
            assert.strictEqual(result, pascalCasedObj.Name);

            // multiple fields
            queryResults = await session.query({ collection: "People" })
                .selectFields(["Name", "Age"])
                .all();
            assert.ok(queryResults.length);
            result = queryResults[0];
            assert.strictEqual(result.name, "John");
            assert.strictEqual(result.age, 25);

        } finally {
            if (store) {
                store.dispose();
            }
        }
    });

    it("loads PascalCased cmpXchg as camelCased", async () => {
        {
            const session = regularStore.openSession({
                transactionMode: "ClusterWide"
            });
            await session.advanced.clusterTransaction.createCompareExchangeValue("cmp/1", pascalCasedObj);
            await session.saveChanges();
        }

        let store: IDocumentStore;
        try {
            store = getStoreWithCustomConventions((s) => {
                s.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
                s.conventions.entityFieldNameConvention = "camel";
                s.conventions.remoteEntityFieldNameConvention = "pascal";
            });

            const session = store.openSession({
                transactionMode: "ClusterWide"
            });
            const loadedCmp = await session.advanced.clusterTransaction.getCompareExchangeValue<any>("cmp/1");
            const loaded = loadedCmp.value;
            assert.strictEqual(loaded.name, pascalCasedObj.Name);
            assert.strictEqual(loaded.equipment[0].name, pascalCasedObj.Equipment[0].Name);
        } finally {
            store?.dispose();
        }
    });

    //TODO: RDBC-448
    it.skip("stores camelCased cmpXChg as PascalCased", async () => {
        let customCaseStore: IDocumentStore;
        const stored = camelCasedObj;
        try {
            customCaseStore = getStoreWithCustomConventions((s) => {
                s.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
                s.conventions.entityFieldNameConvention = "camel";
                s.conventions.remoteEntityFieldNameConvention = "pascal";
            });

            {
                const session = customCaseStore.openSession({ transactionMode: "ClusterWide" });
                await session.advanced.clusterTransaction.createCompareExchangeValue("cmp/1", camelCasedObj);
                await session.saveChanges();
            }
        } finally {
            if (customCaseStore) {
                customCaseStore.dispose();
            }
        }

        {
            const session = regularStore.openSession({ transactionMode: "ClusterWide" });
            const loadedCmp = await session.advanced.clusterTransaction.getCompareExchangeValue<any>("cmp/1");
            const loaded = loadedCmp.value;
            assert.strictEqual(loaded.Name, stored.name);
            assert.strictEqual(loaded.Equipment[0].Name, stored.equipment[0].name);
        }
    });

    it("returns correct modified document after patch", async () => {
        class PascalDoc {
            public SIPCall: string
        }

        {
            const session = regularStore.openSession();
            const pascalDoc = new PascalDoc();
            pascalDoc.SIPCall = "RavenDB";

            await session.store(pascalDoc, "pascal/1");
            await session.saveChanges();
        }
        let modifiedDocument
        regularStore.addSessionListener("afterSaveChanges", event => {
            modifiedDocument = event.entity
        });

        const session = regularStore.openSession();
        await session.load("pascal/1");

        const patchRequest = PatchRequest.forScript("this.SIPCall = \"Patched\"");
        session.advanced.defer(new PatchCommandData("pascal/1", null, patchRequest))
        await session.saveChanges();

        assert.strictEqual(modifiedDocument.SIPCall, "Patched")
        assert.ok(!("sipCall" in modifiedDocument));
    });
});
