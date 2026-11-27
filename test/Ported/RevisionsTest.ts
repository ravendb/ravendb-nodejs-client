import assert from "node:assert"
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../Utils/TestUtil.js";

import {
    ConfigureRevisionsOperation, CONSTANTS,
    DocumentStore, GetStatisticsOperation,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration,
    GetRevisionsOperation,
    GetRevisionsParameters,
    ConfigureRevisionsOperationResult,
    RevisionsResult,
    GetRevisionsBinEntryCommand,
    ObjectUtil
} from "../../src/index.js";
import { User } from "../Assets/Entities.js";
import { Company } from "../Assets/Orders.js";
import { assertThat, assertThrows } from "../Utils/AssertExtensions.js";
import { delay } from "../../src/Utility/PromiseUtil.js";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RevisionsTest", function () {

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
            customStore.conventions.serverToLocalFieldNameConverter = ObjectUtil.pascal;
            customStore.conventions.localToServerFieldNameConverter = ObjectUtil.camel;
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

        const revisionsBinEntryCommand = new GetRevisionsBinEntryCommand(store.conventions, 0, 20);
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

        {
            const session = store.openSession();
            const revision = session.advanced.lazily.load("users/1", User);
            const doc = await revision.getValue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
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

        {
            const session = store.openSession();
            const revisions = await session.advanced.revisions.get(cv, User);
            const revisionsLazy = session.advanced.revisions.lazily.get(cv, User);
            const revisionsLazilyValue = await revisionsLazy.getValue();

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

    it("canGetRevisionsByChangeVectors2", async function() {
        await testContext.setupRevisions(store, false, 5);

        const user1 = new User();
        user1.name = "Jane";

        {
            const session = store.openSession();
            await session.store(user1);
            await session.saveChanges();

            for (let i = 0; i < 10; i++) {
                const user = await session.load(user1.id, User);
                user.name = "Jane" + i;
                await session.saveChanges();
            }
        }

        let allCVS: string[];

        {
            const session = store.openSession();
            const metadata = await session.advanced.revisions.getMetadataFor(user1.id);
            allCVS = metadata.map(x => x[CONSTANTS.Documents.Metadata.CHANGE_VECTOR]);

            const revisionsByCv = await session.advanced.revisions.get(allCVS, User);
            for (let i = 0; i < allCVS.length; i++) {
                assertThat(revisionsByCv)
                    .containsKey(allCVS[i]);

                const user = await session.advanced.revisions.get(allCVS[i], User);
                assertThat(revisionsByCv[allCVS[i]].name)
                    .isEqualTo(user.name);
            }
        }
    });

    it("canGetRevisionsByChangeVectorsNonExist", async function () {
        await testContext.setupRevisions(store, false, 5);

        const user1 = new User();
        user1.name = "Jane";

        {
            const session = store.openSession();
            await session.store(user1);
            await session.saveChanges();

            for (let i = 0; i < 10; i++) {
                const user = await session.load(user1.id, User);
                user.name = "Jane" + i;
                await session.saveChanges();
            }
        }

        {
            const session = store.openSession();
            const allCvs = ["AB:1", "AB:2", "AB:3"];
            const revisionsByCv = await session.advanced.revisions.get(allCvs, User);

            assertThat(Object.keys(revisionsByCv))
                .hasSize(3);

            for (const val of Object.values(revisionsByCv)) {
                assertThat(val)
                    .isNull();
            }

            const cv = "AB:1";
            const revision = await session.advanced.revisions.get(cv, User);
            assertThat(revision)
                .isNull();
        }
    })

    it("canGetRevisionsByIdStartTake", async function() {
        await testContext.setupRevisions(store, false, 123);

        const user1 = new User();
        user1.name = "Jane";

        {
            const session = store.openSession();
            await session.store(user1);
            await session.saveChanges();

            for (let i = 0; i < 10; i++) {
                const user = await session.load(user1.id, User);
                user.name = "Jane" + i;
                await session.saveChanges();
            }
        }

        let revisionsResult = await store.operations.send(new GetRevisionsOperation(user1.id, {
            start: 0,
            pageSize: 5,
            documentType: User
        }));
        assertThat(revisionsResult.totalResults)
            .isEqualTo(11);
        assertThat(revisionsResult.results)
            .hasSize(5);

        let revisionNames = revisionsResult.results.map(x => x.name);

        for (let i = revisionsResult.totalResults - 2; i >= 5; i--) {
            assertThat(revisionNames)
                .contains("Jane" + i);
        }

        revisionsResult = await store.operations.send(new GetRevisionsOperation(user1.id, {
            start: 6,
            pageSize: 5,
            documentType: User
        }));

        assertThat(revisionsResult.totalResults)
            .isEqualTo(11);
        assertThat(revisionsResult.results)
            .hasSize(5);

        revisionNames = revisionsResult.results.map(x => x.name);

        for (let i = revisionsResult.totalResults - 2 - 6; i >= 0; i--) {
            assertThat(revisionNames)
                .contains("Jane" + i);
        }
    })
});

(RavenTestContext.isPullRequest ? describe.skip : describe)("RevisionsTests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("CanGetNullForNotExistsDocument", async () => {
        await setupDefaultRevisions(store);

        const session = store.openSession();
        const revisions = await session.advanced.revisions.getFor<User>("users/1");
        assert.deepStrictEqual(revisions, []);

        const metadata = await session.advanced.revisions.getMetadataFor("users/1");
        assert.deepStrictEqual(metadata, []);
    });

    it("WillCreateValidRevisionWhenCompressionDocumentWasSaved", async () => {
        const user = new User();
        user.name = "1".repeat(4096 * 2);

        await setupDefaultRevisions(store);

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const actualUser = await session.load(user.id, User);
            assertThat(actualUser.name).isEqualTo(user.name);

            const users = await session.advanced.revisions.getFor(user.id, { documentType: User });
            assertThat(users).hasSize(1);
            assertThat(users[0].name).isEqualTo(user.name);
        }
    });

    it("WillDeleteOldRevisions", async () => {
        const company = new Company();
        company.name = "Company #1";

        await setupDefaultRevisions(store);

        {
            const session = store.openSession();
            await session.store(company);
            await session.saveChanges();
            for (let i = 0; i < 10; i++) {
                company.name = "Company #2: " + i;
                await session.saveChanges();
            }
        }

        const session = store.openSession();
        const revisions = await session.advanced.revisions.getFor(company.id, { documentType: Company });
        assertThat(revisions).hasSize(5);
        assertThat(revisions[0].name).isEqualTo("Company #2: 9");
        assertThat(revisions[4].name).isEqualTo("Company #2: 5");
    });

    it("RevisionsOrder", async () => {
        await setupDefaultRevisions(store);

        for (const name of ["Hibernating", "Hibernating Rhinos", "Hibernating Rhinos - RavenDB"]) {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name }), "users/1");
            await session.store(Object.assign(new User(), { name: name + "11" }), "users/11");
            await session.saveChanges();
        }

        const session = store.openSession();
        const users = await session.advanced.revisions.getFor("users/1", { documentType: User });
        assert.deepStrictEqual(users.map(x => x.name), ["Hibernating Rhinos - RavenDB", "Hibernating Rhinos", "Hibernating"]);
    });

    it("CanGetCountersSnapshotInRevisions", async () => {
        await setupDefaultRevisions(store);

        {
            const session = store.openSession();
            await session.store(new Company(), "companies/1-A");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load("companies/1-A", Company);

            company.name = "HR";
            await session.saveChanges();

            session.countersFor(company).increment("Likes", 100);
            await session.saveChanges();

            // no revision for this one
            session.countersFor(company).increment("Likes", 50);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const companiesRevisions = await session.advanced.revisions.getFor("companies/1-A", { documentType: Company });
            assertThat(companiesRevisions).hasSize(3);
            const metadatas = companiesRevisions.map(c => session.advanced.getMetadataFor(c));

            assertThat(companiesRevisions[0].name).isEqualTo("HR");
            assert.deepStrictEqual({ ...metadatas[0][CONSTANTS.Documents.Metadata.REVISION_COUNTERS] }, { Likes: 100 });

            assertThat(companiesRevisions[1].name).isEqualTo("HR");
            assert.ok(!(CONSTANTS.Documents.Metadata.REVISION_COUNTERS in metadatas[1]));

            assert.ok(companiesRevisions[2].name == null);
            assert.ok(!(CONSTANTS.Documents.Metadata.REVISION_COUNTERS in metadatas[2]));
        }

        {
            const session = store.openSession();
            const company = await session.load("companies/1-A", Company);

            company.name = "Hibernating Rhinos";
            await session.saveChanges();

            session.countersFor(company).increment("Dislikes", 20);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const companiesRevisions = await session.advanced.revisions.getFor("companies/1-A", { documentType: Company });
            assertThat(companiesRevisions).hasSize(5);
            const metadatas = companiesRevisions.map(c => session.advanced.getMetadataFor(c));

            assertThat(companiesRevisions[0].name).isEqualTo("Hibernating Rhinos");
            assert.deepStrictEqual({ ...metadatas[0][CONSTANTS.Documents.Metadata.REVISION_COUNTERS] }, { Likes: 150, Dislikes: 20 });

            assertThat(companiesRevisions[1].name).isEqualTo("Hibernating Rhinos");
            assert.deepStrictEqual({ ...metadatas[1][CONSTANTS.Documents.Metadata.REVISION_COUNTERS] }, { Likes: 150 });

            assertThat(companiesRevisions[2].name).isEqualTo("HR");
            assert.deepStrictEqual({ ...metadatas[2][CONSTANTS.Documents.Metadata.REVISION_COUNTERS] }, { Likes: 100 });

            assertThat(companiesRevisions[3].name).isEqualTo("HR");
            assert.ok(!(CONSTANTS.Documents.Metadata.REVISION_COUNTERS in metadatas[3]));

            assert.ok(companiesRevisions[4].name == null);
            assert.ok(!(CONSTANTS.Documents.Metadata.REVISION_COUNTERS in metadatas[4]));
        }
    });

    it("GetRevisionsByIdShouldGetNotModifiedStatus", async () => {
        const company = new Company();
        company.name = "Company Name";

        await setupDefaultRevisions(store);

        {
            const session = store.openSession();
            await session.store(company);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company2 = await session.load(company.id, Company);
            company2.name = "Hibernating Rhinos";
            await session.saveChanges();
        }

        const session = store.openSession();
        let status: number;
        const url = "/revisions?&id=" + encodeURIComponent(company.id);
        session.advanced.requestExecutor.on("succeedRequest", args => {
            if (args.url.includes(url)) {
                status = args.response.status;
            }
        });

        const maxDate = new Date("9999-12-31T23:59:59.999Z");

        let revision = await session.advanced.revisions.get(company.id, maxDate, Company);
        assertThat(revision).isNotNull();
        assert.notStrictEqual(status, 304);

        revision = await session.advanced.revisions.get(company.id, maxDate, Company);
        assertThat(revision).isNotNull();
        assertThat(status).isEqualTo(304);
    });

    it("GetRevisionsByChangeVectorsShouldGetNotModifiedStatus", async () => {
        const id = "users/1";
        await setupDefaultRevisions(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Fitzchak" }), id);
            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            const user = await session.load(id, User);
            user.name = "Fitzchak " + i;
            await session.saveChanges();
        }

        const session = store.openSession();
        const revisionsMetadata = await session.advanced.revisions.getMetadataFor(id);
        assertThat(revisionsMetadata).hasSize(11);

        const changeVectors = revisionsMetadata.map(x => x[CONSTANTS.Documents.Metadata.CHANGE_VECTOR] as string);
        changeVectors.push("NotExistsChangeVector");

        let status: number;
        const url = "/revisions?" + changeVectors.map(cv => "&changeVector=" + encodeURIComponent(cv)).join("");
        session.advanced.requestExecutor.on("succeedRequest", args => {
            if (args.url.includes(url)) {
                status = args.response.status;
            }
        });

        let revisions = await session.advanced.revisions.get(changeVectors, Company);
        assertThat(revisions).isNotNull();
        assert.notStrictEqual(status, 304);

        revisions = await session.advanced.revisions.get(changeVectors, Company);
        assertThat(revisions).isNotNull();
        assertThat(status).isEqualTo(304);
    });
});

async function setupDefaultRevisions(store: IDocumentStore) {
    const collection = (config: Partial<RevisionsCollectionConfiguration>) =>
        Object.assign(new RevisionsCollectionConfiguration(), config);

    const configuration = new RevisionsConfiguration();
    configuration.defaultConfig = collection({ disabled: false, minimumRevisionsToKeep: 5 });
    configuration.collections = new Map([
        ["Users", collection({ disabled: false, purgeOnDelete: true, minimumRevisionsToKeep: 123 })],
        ["People", collection({ disabled: false, minimumRevisionsToKeep: 10 })],
        ["Comments", collection({ disabled: true })],
        ["Products", collection({ disabled: true })]
    ]);

    await store.maintenance.send(new ConfigureRevisionsOperation(configuration));
}
