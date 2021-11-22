import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    ConfigureRevisionsOperation,
    DocumentStore, GetStatisticsOperation,
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
import {
    GetRevisionsOperation,
    GetRevisionsParameters
} from "../../src/Documents/Operations/Revisions/GetRevisionsOperation";
import { RevisionsResult } from "../../src/Documents/Operations/Revisions/RevisionsResult";
import { delay } from "../../src/Utility/PromiseUtil";


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
            assert.strictEqual(allRevisions[0] instanceof User, true);
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

    it("canGetNonExistingRevisionsByChangeVectorAsyncLazily", async function() {
        const session = store.openSession();
        const lazy = session.advanced.revisions.lazily.get("dummy", User);
        const user = await lazy.getValue();

        assertThat(session.advanced.numberOfRequests)
            .isEqualTo(1);
        assertThat(user)
            .isNull();
    });

    it("canGetRevisionsByChangeVectorsLazily", async function () {
        const id = "users/1";
        await testContext.setupRevisions(store, false, 123);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load(id, Company);
            user.name = "Omer" + i;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const revisionsMetadata = await session.advanced.revisions.getMetadataFor(id);
            assertThat(revisionsMetadata)
                .hasSize(11);

            const changeVectors = revisionsMetadata.map(x => x["@change-vector"]);
            const changeVectors2 = revisionsMetadata.map(x => x["@change-vector"]);

            const revisionsLazy = session.advanced.revisions.lazily.get(changeVectors, User);
            const revisionsLazy2 = session.advanced.revisions.lazily.get(changeVectors2, User);

            const lazyResult = await revisionsLazy.getValue();
            const revisions = await session.advanced.revisions.get(changeVectors, User);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(Object.keys(lazyResult).length)
                .isEqualTo(Object.keys(revisions).length);
        }
    });

    it("canGetForLazily", async function () {
        const id = "users/1";
        const id2 = "users/2";

        await testContext.setupRevisions(store, false, 123);

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Omer";
            await session.store(user1, id);

            const user2 = new User();
            user2.name = "Rhinos";
            await session.store(user2, id2);

            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load(id, Company);
            user.name = "Omer" + i;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const revision = await session.advanced.revisions.getFor<User>("users/1", {
                documentType: User
            });
            const revisionsLazy = session.advanced.revisions.lazily.getFor<User>("users/1", {
                documentType: User
            });
            session.advanced.revisions.lazily.getFor<User>("users/2", {
                documentType: User
            });

            const revisionsLazilyResult = await revisionsLazy.getValue();

            assertThat(revisionsLazilyResult[0] instanceof User)
                .isTrue();

            assertThat(revision.map(x => x.name).join(","))
                .isEqualTo(revisionsLazilyResult.map(x => x.name).join(","));
            assertThat(revision.map(x => x.id).join(","))
                .isEqualTo(revisionsLazilyResult.map(x => x.id).join(","));

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
        }
    });

    it("canGetRevisionsByIdAndTimeLazily", async function () {
        const id = "users/1";
        const id2 = "users/2";

        await testContext.setupRevisions(store, false, 123);

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Omer";
            await session.store(user1, id);

            const user2 = new User();
            user2.name = "Rhinos";
            await session.store(user2, id2);

            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load(id, Company);
            user.name = "Omer" + i;
            await session.saveChanges();

            await delay(2);
        }

        {
            const session = store.openSession();
            const revision = await session.advanced.revisions.get<User>("users/1", new Date());
            const revisionLazily = await session.advanced.revisions.lazily.get<User>("users/1", new Date());
            session.advanced.revisions.lazily.get<User>("users/2", new Date());

            const revisionLazilyResult = await revisionLazily.getValue();
            assertThat(revisionLazilyResult instanceof User)
                .isTrue();
            assertThat(revision.id)
                .isEqualTo(revisionLazilyResult.id);
            assertThat(revision.name)
                .isEqualTo(revisionLazilyResult.name);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
        }
    });

    it("canGetMetadataForLazily", async function () {
        const id = "users/1";
        const id2 = "users/2";

        await testContext.setupRevisions(store, false, 123);

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Omer";
            await session.store(user1, id);

            const user2 = new User();
            user2.name = "Rhinos";
            await session.store(user2, id2);

            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load(id, Company);
            user.name = "Omer" + i;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const revisionsMetadata = await session.advanced.revisions.getMetadataFor(id);
            const revisionsMetaDataLazily = session.advanced.revisions.lazily.getMetadataFor(id);
            const revisionsMetaDataLazily2 = session.advanced.revisions.lazily.getMetadataFor(id2);
            const revisionsMetaDataLazilyResult = await revisionsMetaDataLazily.getValue();

            assertThat(revisionsMetadata.map(x => x["@id"]).join(","))
                .isEqualTo(revisionsMetaDataLazilyResult.map(x => x["@id"]).join(","));

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
        }
    });

    it("canGetRevisionsByChangeVectorLazily", async function () {
        const id = "users/1";
        const id2 = "users/2";

        await testContext.setupRevisions(store, false, 123);

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Omer";
            await session.store(user1, id);

            const user2 = new User();
            user2.name = "Rhinos";
            await session.store(user2, id2);

            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load(id, Company);
            user.name = "Omer" + i;
            await session.saveChanges();
        }

        const stats = await store.maintenance.send(new GetStatisticsOperation());
        const dbId = stats.databaseId;

        const cv = "A:23-" + dbId;
        const cv2 = "A:3-" + dbId;

        {
            const session = store.openSession();
            const revisions = await session.advanced.revisions.get(cv, User);
            const revisionsLazily = await session.advanced.revisions.lazily.get(cv, User);
            const revisionsLazily1 = await session.advanced.revisions.lazily.get(cv2, User);

            const revisionsLazilyValue = await revisionsLazily.getValue();

            assertThat(revisionsLazilyValue instanceof User)
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(revisionsLazilyValue.id)
                .isEqualTo(revisions.id);
            assertThat(revisionsLazilyValue.name)
                .isEqualTo(revisions.name);
        }
    });

    it("canGetAllRevisionsForDocument_UsingStoreOperation", async function () {
        const company = new Company();
        company.name = "Company Name";

        await testContext.setupRevisions(store, false, 123);

        {
            const session = store.openSession();
            await session.store(company);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company3 = await session.load(company.id, Company);
            company3.name = "Hibernating Rhinos";
            await session.saveChanges();
        }

        const revisionsResult: RevisionsResult<Company> = await store.operations.send(
            new GetRevisionsOperation<Company>(company.id, {
            documentType: Company
        }));
        assertThat(revisionsResult.totalResults)
            .isEqualTo(2);

        const companiesRevisions = revisionsResult.results;
        assertThat(companiesRevisions)
            .hasSize(2);
        assertThat(companiesRevisions[0] instanceof Company)
            .isTrue();
        assertThat(companiesRevisions[0].name)
            .isEqualTo("Hibernating Rhinos");
        assertThat(companiesRevisions[1].name)
            .isEqualTo("Company Name");
    });

    it("canGetRevisionsWithPaging_UsingStoreOperation", async function () {
        await testContext.setupRevisions(store, false, 123);

        const id = "companies/1";

        {
            const session = store.openSession();
            await session.store(new Company(), id);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company2 = await session.load(id, Company);
            company2.name = "Hibernating";
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company3 = await session.load(id, Company);
            company3.name = "Hibernating Rhinos";
            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const company = await session.load(id, Company);
            company.name = "HR" + i;
            await session.saveChanges();
        }

        const parameters: GetRevisionsParameters<Company> = {
            documentType: Company,
            start: 10
        };

        const revisionsResult = await store.operations.send(new GetRevisionsOperation(id, parameters));

        assertThat(revisionsResult.totalResults)
            .isEqualTo(13);

        const companiesRevisions = revisionsResult.results;
        assertThat(companiesRevisions)
            .hasSize(3);

        assertThat(companiesRevisions[0] instanceof Company)
            .isTrue();

        assertThat(companiesRevisions[0].name)
            .isEqualTo("Hibernating Rhinos");
        assertThat(companiesRevisions[1].name)
            .isEqualTo("Hibernating");
        assertThat(companiesRevisions[2].name)
            .isNull();
    });

    it("canGetRevisionsWithPaging2_UsingStoreOperation", async function () {
        await testContext.setupRevisions(store, false, 100);

        const id = "companies/1";

        {
            const session = store.openSession();
            await session.store(new Company(), id);
            await session.saveChanges();
        }

        for (let i = 0; i < 99; i++) {
            const session = store.openSession();
            const company = await session.load(id, Company);
            company.name = "HR" + i;
            await session.saveChanges();
        }

        const revisionsResult = await store.operations.send(new GetRevisionsOperation<Company>(id, {
            start: 50,
            pageSize: 10,
            documentType: Company
        }));
        assertThat(revisionsResult.totalResults)
            .isEqualTo(100);

        const companiesRevisions = revisionsResult.results;
        assertThat(companiesRevisions)
            .hasSize(10);

        let count = 0 ;
        for (let i = 48; i > 38; i--) {
            assertThat(companiesRevisions[count] instanceof Company)
                .isTrue();
            assertThat((await companiesRevisions[count++]).name)
                .isEqualTo("HR" + i);
        }
    });

    it("canGetRevisionsCountFor", async function () {
        const company = new Company();
        company.name = "Company Name";

        await testContext.setupRevisions(store, false, 100);

        {
            const session = store.openSession();
            await session.store(company);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company2 = await session.load(company.id, Company);
            company2.name = "Israel";
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company3 = await session.load(company.id, Company);
            company3.name = "Hibernating Rhinos";
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const companiesRevisionsCount = await session.advanced.revisions.getCountFor(company.id);
            assertThat(companiesRevisionsCount)
                .isEqualTo(3);
        }
    });
});
