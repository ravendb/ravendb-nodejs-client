import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    ConfigureRevisionsOperation,
    DocumentStore,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../src";
import { User } from "../Assets/Entities";
// tslint:disable:max-line-length
import { ConfigureRevisionsOperationResult } from "../../src/Documents/Operations/Revisions/ConfigureRevisionsOperation";
// tslint:enable:max-line-length
import { GetRevisionsBinEntryCommand } from "../../src/Documents/Commands/GetRevisionsBinEntryCommand";
import { Company } from "../Assets/Orders";
import { assertThat, assertThrows } from "../Utils/AssertExtensions";

describe("RevisionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can handle revisions", async () => {
        const configurationResult = await testContext.setupRevisions(store, false, 4);
        assert.ok(configurationResult instanceof ConfigureRevisionsOperationResult);
        assert.ok(configurationResult.raftCommandIndex);

        for (let i = 0; i < 4; i++) {
            const session = store.openSession();

            const user = new User();
            user.name = "user" + (i + 1);
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const allRevisions = await session.advanced.revisions.getFor<User>("users/1");
            assert.strictEqual(allRevisions.length, 4);
            assert.strictEqual(allRevisions[0].name, "user4");
            assert.strictEqual(allRevisions[1].name, "user3");
            assert.strictEqual(allRevisions[2].name, "user2");
            assert.strictEqual(allRevisions[3].name, "user1");

            const revisionsSkipFirst = await session.advanced.revisions.getFor<User>("users/1", { start: 1 });
            assert.strictEqual(revisionsSkipFirst.length, 3);
            assert.strictEqual(revisionsSkipFirst[0].name, "user3");
            assert.strictEqual(revisionsSkipFirst[1].name, "user2");
            assert.strictEqual(revisionsSkipFirst[2].name, "user1");

            const revisionsSkipFirstTakeTwo = await session.advanced.revisions.getFor<User>(
                "users/1", { start: 1, pageSize: 2 });
            assert.strictEqual(revisionsSkipFirstTakeTwo.length, 2);
            assert.strictEqual(revisionsSkipFirstTakeTwo[0].name, "user3");
            assert.strictEqual(revisionsSkipFirstTakeTwo[1].name, "user2");

            const allMetadata = await session.advanced.revisions.getMetadataFor("users/1");
            assert.strictEqual(allMetadata.length, 4);

            const metadataSkipFirst = await session.advanced.revisions.getMetadataFor("users/1", { start: 1 });
            assert.strictEqual(metadataSkipFirst.length, 3);

            const metadataSkipFirstTakeTwo = await session.advanced.revisions
                .getMetadataFor("users/1", { start: 1, pageSize: 2 });
            assert.strictEqual(metadataSkipFirstTakeTwo.length, 2);

            const user = await session.advanced.revisions
                .get<User>(metadataSkipFirst[0]["@change-vector"]);
            assert.strictEqual(user.name, "user3");
        }
    });

    it("with key case transform", async () => {
        const configurationResult = await testContext.setupRevisions(store, false, 4);

        let customStore: DocumentStore;
        try {
            customStore = new DocumentStore(store.urls, store.database);
            customStore.conventions.entityFieldNameConvention = "pascal";
            customStore.conventions.remoteEntityFieldNameConvention = "camel";
            customStore.initialize();

            const session = store.openSession();

            const user = {
                Name: "Marcin",
                Age: 30,
                Pet: "users/4"
            };

            await session.store(user, "users/1");
            await session.saveChanges();

            user.Name = "Roman";
            user.Age = 40;
            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<{ Name: string, Age: 30 }>("users/1");

            assert.strictEqual(revisions.length, 2);
            assert.strictEqual(revisions[0].Name, "Roman");
            assert.strictEqual(revisions[1].Name, "Marcin");
        } finally {
            if (customStore) {
                customStore.dispose();
            }
        }
    });

    it("can list revisions bin", async () => {
        await testContext.setupRevisions(store, false, 4);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "user1";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.delete("users/1");
            await session.saveChanges();
        }

        const revisionsBinEntryCommand = new GetRevisionsBinEntryCommand(store.conventions, 1024, 20);
        await store.getRequestExecutor().execute(revisionsBinEntryCommand);

        const result = revisionsBinEntryCommand.result;
        assert.strictEqual(result.results.length, 1);
        assert.strictEqual(result.results[0]["@metadata"]["@id"], "users/1");
    });

    it("canGetRevisionsByChangeVectors", async () => {
        const id = "users/1";

        await testContext.setupRevisions(store, false, 100);

        {
            const session = store.openSession();
            const user = Object.assign(new User(), {
                name: "Fitzchak"
            });
            await session.store(user, id);
            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load<Company>(id, Company);
            user.name = "Fizchak" + i;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const revisionsMetadata = await session
                .advanced
                .revisions
                .getMetadataFor(id);
            assertThat(revisionsMetadata)
                .hasSize(11);

            const changeVectors = revisionsMetadata
                .map(x => x["@change-vector"]);

            changeVectors.push("NotExistsChangeVector");

            const revisions = await session.advanced.revisions.get<User>(changeVectors, User);
            assertThat(revisions["NotExistsChangeVector"])
                .isNull();

            assertThat(await session.advanced.revisions.get<User>("NotExistsChangeVector", User))
                .isNull();
        }
    });

    it("collectionCaseSensitiveTest1", async () => {
        const id = "user/1";
        const configuration = new RevisionsConfiguration();

        const collectionConfiguration = new RevisionsCollectionConfiguration();
        collectionConfiguration.disabled = false;

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("uSErs", collectionConfiguration);

        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));

        {
            const session = store.openSession();
            const user = new User();
            user.name = "raven";
            await session.store(user, id);
            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load<Company>(id, Company);
            user.name = "raven" + i;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const revisionsMetadata = await session.advanced.revisions.getMetadataFor(id);
            assertThat(revisionsMetadata)
                .hasSize(11);
        }
    });

    it("collectionCaseSensitiveTest2", async () => {
        const id = "uSEr/1";

        const configuration = new RevisionsConfiguration();

        const collectionConfiguration = new RevisionsCollectionConfiguration();
        collectionConfiguration.disabled = false;

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("users", collectionConfiguration);

        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));

        {
            const session = store.openSession();
            const user = new User();
            user.name = "raven";
            await session.store(user, id);
            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load<Company>(id, Company);
            user.name = "raven " + i;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const revisionsMetadata = await session.advanced.revisions.getMetadataFor(id);
            assertThat(revisionsMetadata)
                .hasSize(11);
        }
    });

    it("collectionCaseSensitiveTest3", async () =>{
        const configuration = new RevisionsConfiguration();

        const c1 = new RevisionsCollectionConfiguration();
        c1.disabled = false;

        const c2 = new RevisionsCollectionConfiguration();
        c2.disabled = false;

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("users", c1);
        configuration.collections.set("USERS", c2);

        await assertThrows(() => store.maintenance.send(new ConfigureRevisionsOperation(configuration)), e => {
            assertThat(e.name)
                .isEqualTo("RavenException");
        });
    });
});
