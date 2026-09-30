import { Company, User } from "../../Assets/Entities.js";
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../../Utils/TestUtil.js";

import DocumentStore, {
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration,
    ConfigureRevisionsOperation,
    DatabaseSmugglerImportOptions,
    ObjectUtil
} from "../../../src/index.js";
import assert from "node:assert"
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { assertThat } from "../../Utils/AssertExtensions.js";

// skipped for the time being
// subscriptions are not working with server version 4.1
// due to RavenDB-12127
(RavenTestContext.isPullRequest ? describe.skip : describe)("RevisionsSubscriptionsTest", function () {
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
                        for (const item of batch.items) {
                            const result = item.result;
                            names.add(
                                (result.current ? result.current.name : null)
                                + (result.previous ? result.previous.name : null));

                            if (names.size === 100) {
                                resolve();
                            }
                        }
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
                    for (const item of batch.items) {
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
                    }

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
            store2.conventions.serverToLocalFieldNameConverter = ObjectUtil.camel;
            store2.conventions.localToServerFieldNameConverter = ObjectUtil.pascal;
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

    it("revisions subscriptions with custom script", async function () {
        const subscriptionId = await store.subscriptions.create({
            query: `
                declare function match(d) {
                    return d.Current.age > d.Previous.age;
                }
                from Users (Revisions = true) as d
                where match(d)
                select { Id: id(d.Current), Age: d.Current.age }`
        });

        await configureRevisions(store, "Users", "Dons");

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const session = store.openSession();
                const user = new User();
                user.name = "users" + i + " ver " + j;
                user.age = j;
                await session.store(user, "users/" + i);

                const company = new Company();
                company.name = "dons" + i + " ver " + j;
                await session.store(company, "companies/" + i);

                await session.saveChanges();
            }
        }

        const sub = store.subscriptions.getSubscriptionWorker<UserAgeResult>({
            subscriptionName: subscriptionId
        });

        try {
            await new Promise<void>((resolve, reject) => {
                const names = new Set<string>();

                sub.on("error", reject);

                sub.on("batch", (batch, callback) => {
                    for (const item of batch.items) {
                        names.add(item.result.Id + item.result.Age);

                        if (names.size === 90) {
                            resolve();
                        }
                    }

                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });

    it("revisions subscriptions with custom script compare docs", async function () {
        const subscriptionId = await store.subscriptions.create({
            query: `
                declare function match(d) {
                    return d.Current.age > d.Previous.age;
                }
                from Users (Revisions = true) as d
                where match(d)
                select { Id: id(d.Current), Age: d.Current.age }`
        });

        await configureRevisions(store, "Users", "Dons");

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const session = store.openSession();
                const user = new User();
                user.name = "users" + i + " ver " + j;
                user.age = j;
                await session.store(user, "users/" + i);

                const company = new Company();
                company.name = "dons" + i + " ver " + j;
                await session.store(company, "companies/" + i);

                await session.saveChanges();
            }
        }

        const sub = store.subscriptions.getSubscriptionWorker<UserAgeResult>({
            subscriptionName: subscriptionId
        });

        try {
            await new Promise<void>((resolve, reject) => {
                const names = new Set<string>();
                let maxAge = -1;

                sub.on("error", reject);

                sub.on("batch", (batch, callback) => {
                    for (const item of batch.items) {
                        if (item.result.Age > maxAge) {
                            names.add(item.result.Id + item.result.Age);
                            maxAge = item.result.Age;
                        }

                        if (names.size === 9) {
                            resolve();
                        }
                    }

                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });

    const metadataQueries = [
        {
            changeVectorSource: "@metadata",
            query: `
                from Orders (Revisions = true) as docs
                select {
                    Current: docs.Current,
                    Previous: docs.Previous,
                    CurrentMetadata: docs.Current["@metadata"],
                    PreviousMetadata: docs.Previous["@metadata"],
                    CurrentId: id(docs.Current),
                    PreviousId: id(docs.Previous),
                    CurrentChangeVector: docs.Current["@metadata"]["@change-vector"],
                    PreviousChangeVector: docs.Previous["@metadata"]["@change-vector"]
                }`
        },
        {
            changeVectorSource: "metadataFor",
            query: `
                from Orders (Revisions = true) as docs
                select {
                    Current: docs.Current,
                    Previous: docs.Previous,
                    CurrentMetadata: docs.Current["@metadata"],
                    PreviousMetadata: docs.Previous["@metadata"],
                    CurrentId: id(docs.Current),
                    PreviousId: id(docs.Previous),
                    CurrentChangeVector: docs.Current == null ? null : metadataFor(docs.Current)["@change-vector"],
                    PreviousChangeVector: docs.Previous == null ? null : metadataFor(docs.Previous)["@change-vector"]
                }`
        }
    ];

    for (const { changeVectorSource, query } of metadataQueries) {
        it(`can return metadata in revisions subscription with change vector from ${changeVectorSource}`, async function () {
            await importRevisionsDump(store);
            await configureRevisions(store, "Orders");

            const revisions = await collectRevisionsWithMetadata(store, query, 8);
            const metadata = revisionsDump.RevisionDocuments.map(x => x["@metadata"]);

            assertThat(revisions).hasSize(8);

            assertCurrentRevision(revisions[0], metadata[0]);
            assertNoPreviousRevision(revisions[0]);

            for (let i = 1; i < revisions.length - 1; i++) {
                assertCurrentRevision(revisions[i], metadata[i]);
                assertPreviousRevision(revisions[i], metadata[i - 1]);
            }

            const last = revisions.at(-1);
            assertNoCurrentRevision(last);
            assertThat(last.Previous).isNotNull();
            assertThat(last.PreviousMetadata).isNotNull();
            assertThat(last.PreviousId).isNotNull();
            assertThat(last.PreviousChangeVector).isNotNull();
        });
    }

    it("can return filter revisions subscription by current is null", async function () {
        await importRevisionsDump(store);
        await configureRevisions(store, "Orders");

        const revisions = await collectRevisionsWithMetadata(store, `
            from Orders (Revisions = true) as docs
            where docs.Current == null
            select {
                Current: docs.Current,
                Previous: docs.Previous,
                CurrentMetadata: docs.Current["@metadata"],
                PreviousMetadata: docs.Previous["@metadata"],
                CurrentId: id(docs.Current),
                PreviousId: id(docs.Previous),
                CurrentChangeVector: docs.Current == null ? null : metadataFor(docs.Current)["@change-vector"],
                PreviousChangeVector: docs.Previous == null ? null : metadataFor(docs.Previous)["@change-vector"]
            }`, 1);
        const metadata = revisionsDump.RevisionDocuments.map(x => x["@metadata"]);

        assertThat(revisions).hasSize(1);

        assertPreviousRevision(revisions[0], metadata.at(-2));
        assertNoCurrentRevision(revisions[0]);
    });

    it("can return filter revisions subscription by current is not null", async function () {
        await importRevisionsDump(store);
        await configureRevisions(store, "Orders");

        const revisions = await collectRevisionsWithMetadata(store, `
            from Orders (Revisions = true) as docs
            where docs.Current != null
            select {
                Current: docs.Current,
                Previous: docs.Previous,
                CurrentMetadata: docs.Current["@metadata"],
                PreviousMetadata: docs.Previous["@metadata"],
                CurrentId: id(docs.Current),
                PreviousId: id(docs.Previous),
                CurrentChangeVector: docs.Current == null ? null : metadataFor(docs.Current)["@change-vector"],
                PreviousChangeVector: docs.Previous == null ? null : metadataFor(docs.Previous)["@change-vector"]
            }`, 7);
        const metadata = revisionsDump.RevisionDocuments.map(x => x["@metadata"]);

        assertThat(revisions).hasSize(7);

        assertCurrentRevision(revisions[0], metadata[0]);
        assertNoPreviousRevision(revisions[0]);

        for (let i = 1; i < revisions.length; i++) {
            assertCurrentRevision(revisions[i], metadata[i]);
            assertPreviousRevision(revisions[i], metadata[i - 1]);
        }
    });
});

interface UserAgeResult {
    Id: string;
    Age: number;
}

interface RevisionWithMetadata {
    Current: object;
    Previous: object;
    CurrentMetadata: Record<string, string>;
    PreviousMetadata: Record<string, string>;
    CurrentId: string;
    PreviousId: string;
    CurrentChangeVector: string;
    PreviousChangeVector: string;
}

interface RevisionMetadata {
    "@change-vector": string;
    "@id": string;
}

interface RevisionsDump {
    RevisionDocuments: { "@metadata": RevisionMetadata }[];
}

const revisionsDumpPath = fileURLToPath(new URL("../../Assets/revisionsSubscriptionsDump.json", import.meta.url));
const revisionsDump: RevisionsDump = JSON.parse(fs.readFileSync(revisionsDumpPath, "utf8"));

async function configureRevisions(store: IDocumentStore, ...collectionNames: string[]) {
    const defaultCollection = new RevisionsCollectionConfiguration();
    defaultCollection.disabled = false;
    defaultCollection.minimumRevisionsToKeep = 5;

    const configuration = new RevisionsConfiguration();
    configuration.defaultConfig = defaultCollection;
    configuration.collections = new Map<string, RevisionsCollectionConfiguration>();

    for (const collectionName of collectionNames) {
        const collectionConfig = new RevisionsCollectionConfiguration();
        collectionConfig.disabled = false;
        configuration.collections.set(collectionName, collectionConfig);
    }

    await store.maintenance.send(new ConfigureRevisionsOperation(configuration));
}

async function importRevisionsDump(store: IDocumentStore) {
    const options = new DatabaseSmugglerImportOptions();
    options.operateOnTypes = ["RevisionDocuments"];

    const operation = await store.smuggler.import(options, revisionsDumpPath);
    await operation.waitForCompletion();
}

async function collectRevisionsWithMetadata(store: IDocumentStore, query: string, count: number) {
    const subscriptionId = await store.subscriptions.create({ query });

    const sub = store.subscriptions.getSubscriptionWorker<RevisionWithMetadata>({
        subscriptionName: subscriptionId
    });

    try {
        return await new Promise<RevisionWithMetadata[]>((resolve, reject) => {
            const revisions: RevisionWithMetadata[] = [];

            sub.on("error", reject);

            sub.on("batch", (batch, callback) => {
                for (const item of batch.items) {
                    revisions.push(item.result);
                }

                if (revisions.length >= count) {
                    resolve(revisions);
                }

                callback();
            });
        });
    } finally {
        sub.dispose();
    }
}

function assertCurrentRevision(revision: RevisionWithMetadata, metadata: RevisionMetadata) {
    assertThat(revision.CurrentChangeVector).isEqualTo(metadata["@change-vector"]);
    assertThat(revision.CurrentMetadata["@change-vector"]).isEqualTo(metadata["@change-vector"]);
    assertThat(revision.CurrentId).isEqualTo(metadata["@id"]);
    assertThat(revision.CurrentMetadata["@id"]).isEqualTo(metadata["@id"]);
}

function assertPreviousRevision(revision: RevisionWithMetadata, metadata: RevisionMetadata) {
    assertThat(revision.PreviousChangeVector).isEqualTo(metadata["@change-vector"]);
    assertThat(revision.PreviousMetadata["@change-vector"]).isEqualTo(metadata["@change-vector"]);
    assertThat(revision.PreviousId).isEqualTo(metadata["@id"]);
    assertThat(revision.PreviousMetadata["@id"]).isEqualTo(metadata["@id"]);
    assertThat(revision.Previous).isNotNull();
}

function assertNoCurrentRevision(revision: RevisionWithMetadata) {
    assertThat(revision.Current).isNull();
    assertThat(revision.CurrentMetadata).isNull();
    assertThat(revision.CurrentId).isNull();
    assertThat(revision.CurrentChangeVector).isNull();
}

function assertNoPreviousRevision(revision: RevisionWithMetadata) {
    assertThat(revision.Previous).isNull();
    assertThat(revision.PreviousMetadata).isNull();
    assertThat(revision.PreviousId).isNull();
    assertThat(revision.PreviousChangeVector).isNull();
}
