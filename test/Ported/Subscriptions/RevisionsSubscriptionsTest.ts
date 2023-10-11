import { Company, User } from "../../Assets/Entities";
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../../Utils/TestUtil";

import DocumentStore, {
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration,
    ConfigureRevisionsOperation
} from "../../../src";
import * as assert from "assert";

// skipped for the time being
// subscriptions are not working with server version 4.1
// due to RavenDB-12127
(RavenTestContext.is60Server ? describe.skip : describe)("RevisionsSubscriptionsTest", function () {
    this.timeout(5 * 10 * 1000);

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("plain revisions subscriptions", async function() {
        const subscriptionId = await store.subscriptions.createForRevisions({
            documentType: User
        });

        const defaultCollection = new RevisionsCollectionConfiguration();
        defaultCollection.disabled = false;
        defaultCollection.minimumRevisionsToKeep = 51;

        const usersConfig = new RevisionsCollectionConfiguration();
        usersConfig.disabled = false;

        const donsConfig = new RevisionsCollectionConfiguration();
        donsConfig.disabled = false;

        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = defaultCollection;

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("Users", usersConfig);
        configuration.collections.set("Dons", donsConfig);

        const operation = new ConfigureRevisionsOperation(configuration);

        await store.maintenance.send(operation);

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const session = store.openSession();
                const user = new User();
                user.name = "users" + i + " ver " + j;
                await session.store(user, "users/" + i);

                const company = new Company();
                company.name = "dons" + i + " ver " + j;
                await session.store(company, "dons/" + i);

                await session.saveChanges();
            }
        }

        const sub = store.subscriptions.getSubscriptionWorkerForRevisions<User>({
            documentType: User,
            subscriptionName: subscriptionId
        });

        try {
            await new Promise<void>((resolve, reject) => {
                const names = new Set<string>();

                sub.on("error", reject);

                sub.on("batch", (batch, callback) => {
                    try {
                        batch.items.forEach(item => {
                            const result = item.result;
                            names.add(
                                (result.current ? result.current.name : null)
                                + (result.previous ? result.previous.name : null));

                            if (names.size === 100) {
                                resolve();
                            }
                        });
                    } catch (err) {
                        callback(err);
                        return;
                    }

                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });

    it("plain revisions subscriptions compare docs", async function() {
        const subscriptionId = await store.subscriptions.createForRevisions({
            documentType: User
        });

        const defaultCollection = new RevisionsCollectionConfiguration();
        defaultCollection.disabled = false;
        defaultCollection.minimumRevisionsToKeep = 51;

        const usersConfig = new RevisionsCollectionConfiguration();
        usersConfig.disabled = false;

        const donsConfig = new RevisionsCollectionConfiguration();
        donsConfig.disabled = false;

        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = defaultCollection;

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("Users", usersConfig);
        configuration.collections.set("Dons", donsConfig);

        const operation = new ConfigureRevisionsOperation(configuration);

        await store.maintenance.send(operation);

        for (let j = 0; j < 10; j++) {
            const session = store.openSession();
            const user = new User();
            user.name = "users1 ver " + j;
            user.age = j;
            await session.store(user, "users/1");

            const company = new Company();
            company.name = "dons1 ver " + j;
            await session.store(company, "dons/1");

            await session.saveChanges();
        }

        const sub = await store.subscriptions.getSubscriptionWorkerForRevisions<User>({
            subscriptionName: subscriptionId,
            documentType: User
        });

        try {
            await new Promise<void>(resolve => {
                const names = new Set<string>();

                let maxAge = -1;

                sub.on("batch", (batch, callback) => {
                    batch.items.forEach(item => {
                        const x = item.result;

                        if (x.current.age > maxAge && x.current.age  > (x.previous ? x.previous.age : -1)) {
                            names.add(
                                (x.current ? x.current.name : null)
                                + " " + (x.previous ? x.previous.name : null));
                            maxAge = x.current.age;
                        }

                        if (names.size === 10) {
                            resolve();
                        }
                    });

                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });

    it("test revisions subscription with PascalCasing", async function() {
        const store2 = new DocumentStore(store.urls, store.database);
        try {
            store2.conventions.findCollectionNameForObjectLiteral = () => "test";
            store2.conventions.entityFieldNameConvention = "camel";
            store2.conventions.remoteEntityFieldNameConvention = "pascal";
            store2.initialize();
            const subscriptionId = await store2.subscriptions.createForRevisions({
                documentType: User
            });

            const defaultCollection = new RevisionsCollectionConfiguration();
            defaultCollection.disabled = false;
            defaultCollection.minimumRevisionsToKeep = 51;

            const configuration = new RevisionsConfiguration();
            configuration.defaultConfig = defaultCollection;

            const operation = new ConfigureRevisionsOperation(configuration);
            await store2.maintenance.send(operation);

            const expectedNames = [];
            for (let i = 0; i < 1; i++) {
                for (let j = 0; j < 10; j++) {
                    const session = store2.openSession();
                    const user = new User();
                    user.age = i;
                    user.name = "users" + (i + 1) + " ver " + j;
                    expectedNames.push(user.name);
                    await session.store(user, "users/" + (i + 1));
                    await session.saveChanges();
                }
            }

            const sub = store2.subscriptions.getSubscriptionWorkerForRevisions<User>({
                documentType: User,
                subscriptionName: subscriptionId
            });

            let items;
            await new Promise<void>(resolve => {
                sub.on("batch", (batch, callback) => {
                    items = batch.items;
                    callback();
                    resolve();
                });
            });

            assert.strictEqual(items.length, 10);
            assert.strictEqual(items[0].id, "users/1");
            assert.strictEqual(items[0].rawMetadata["@id"], "users/1");

            expectedNames.sort();
            const actualCurrentNames = items.map(x => x.rawResult.current.name);
            actualCurrentNames.sort();

            assert.strictEqual(actualCurrentNames.length, 10);
            assert.strictEqual(JSON.stringify(actualCurrentNames), JSON.stringify(expectedNames));

            const actualPreviousNames = items
                .filter(x => x.rawResult.previous)
                .map(x => x.rawResult.previous.name);

            actualPreviousNames.sort();
            assert.strictEqual(actualPreviousNames.length, 9);
            assert.strictEqual(
                JSON.stringify(actualPreviousNames),
                JSON.stringify(expectedNames.filter(x => x !== "users1 ver 9")));

        } finally {
            store2.dispose();
        }
    });
});
