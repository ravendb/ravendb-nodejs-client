import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";
import { delay } from "bluebird";

describe("CanQueryAndIncludeRevisionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("query_IncludeAllQueryFunctionality", async () => {
        const cvList: string[] = [];

        const id = "users/rhino";

        await testContext.setupRevisions(store, false, 5);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();
        }

        let changeVector: string;

        const beforeDateTime = new Date();

        {
            const session = store.openSession();
            let metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1);

            changeVector = metadatas[0]["@change-vector"];

            session.advanced.patch(id, "firstRevision", changeVector);

            await session.saveChanges();

            cvList.push(changeVector);

            metadatas = await session.advanced.revisions.getMetadataFor(id);

            changeVector = metadatas[0]["@change-vector"];

            cvList.push(changeVector);

            await session.advanced.patch(id, "secondRevision", changeVector);

            await session.saveChanges();

            metadatas = await session.advanced.revisions.getMetadataFor(id);

            changeVector = metadatas[0]["@change-vector"];

            cvList.push(changeVector);

            await session.advanced.patch(id, "changeVectors", cvList);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = await session.query(User)
                .include(builder => {
                    builder.includeRevisions("changeVectors")
                        .includeRevisions("firstRevision")
                        .includeRevisions("secondRevision")
                })
                .waitForNonStaleResults();

            await query.all();

            const revision1 = await session.advanced.revisions.get(cvList[0], User);
            const revision2 = await session.advanced.revisions.get(cvList[1], User);
            const revision3 = await session.advanced.revisions.get(cvList[2], User);

            assertThat(revision1)
                .isNotNull();
            assertThat(revision2)
                .isNotNull();
            assertThat(revision3)
                .isNotNull();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("load_IncludeBuilder_IncludeRevisionByChangeVector", async () => {
        const id = "users/rhino";

        await testContext.setupRevisions(store, false, 5);

        let changeVector;

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();

            const metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1);

            changeVector = metadatas[0]["@change-vector"];

            await session.advanced.patch(id, "changeVector", changeVector);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = await session.load(id, {
                documentType: User,
                includes: builder => builder.includeRevisions("changeVector")
            });

            const revision = await session.advanced.revisions.get(changeVector, User);
            assertThat(revision)
                .isNotNull();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("load_IncludeBuilder_IncludeRevisionByChangeVectors", async () => {
        const cvList: string[] = [];

        const id = "users/rhino";

        await testContext.setupRevisions(store, false, 5);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();
        }

        let changeVector: string;

        {
            const session = store.openSession();
            let metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1);

            changeVector = metadatas[0]["@change-vector"];
            await session.saveChanges();
            cvList.push(changeVector);

            metadatas = await session.advanced.revisions.getMetadataFor(id);
            changeVector = metadatas[0]["@change-vector"];
            cvList.push(changeVector);

            await session.saveChanges();
            metadatas = await session.advanced.revisions.getMetadataFor(id);
            changeVector = metadatas[0]["@change-vector"];

            cvList.push(changeVector);
            await session.advanced.patch(id, "changeVectors", cvList);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = await session.load<User>(id, {
                documentType: User,
                includes: builder => builder.includeRevisions("changeVectors")
            });

            const revision1 = await session.advanced.revisions.get(cvList[0], User);
            const revision2 = await session.advanced.revisions.get(cvList[1], User);
            const revision3 = await session.advanced.revisions.get(cvList[2], User);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("load_IncludeBuilder_IncludeRevisionsByProperty_ChangeVectorAndChangeVectors", async () => {
        const cvList: string[] = [];

        const id = "users/rhino";

        await testContext.setupRevisions(store, false, 5);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();
        }

        let changeVector: string;

        {
            const session = store.openSession();
            let metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1);

            changeVector = metadatas[0]["@change-vector"];
            session.advanced.patch(id, "firstRevision", changeVector);
            await session.saveChanges();
            cvList.push(changeVector);

            metadatas = await session.advanced.revisions.getMetadataFor(id);
            changeVector = metadatas[0]["@change-vector"];
            cvList.push(changeVector);
            session.advanced.patch(id, "secondRevision", changeVector);
            await session.saveChanges();

            metadatas = await session.advanced.revisions.getMetadataFor(id);
            changeVector = metadatas[0]["@change-vector"];
            cvList.push(changeVector);
            session.advanced.patch(id, "changeVectors", cvList);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.load(id, {
                documentType: User,
                includes: builder => builder.includeRevisions("changeVectors").includeRevisions("firstRevision").includeRevisions("secondRevision")
            });

            const revision1 = await session.advanced.revisions.get(cvList[0], User);
            const revision2 = await session.advanced.revisions.get(cvList[1], User);
            const revision3 = await session.advanced.revisions.get(cvList[2], User);

            const revisions = await session.advanced.revisions.get(cvList, User);

            assertThat(revision1)
                .isNotNull();
            assertThat(revision2)
                .isNotNull();
            assertThat(revision3)
                .isNotNull();
            assertThat(revisions)
                .isNotNull();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("load_IncludeBuilder_IncludeRevisionByDateTime_VerifyUtc", async () => {
        let changeVector: string;

        const id = "users/rhino";

        await testContext.setupRevisions(store, false, 5);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();

            const metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1);

            changeVector = metadatas[0]["@change-vector"];
            await session.advanced.patch(id, "changeVector", changeVector);
            await session.advanced.patch(id, "changeVectors", [changeVector]);
            await session.saveChanges();
        }

        const dateTime = new Date();

        await delay(2);

        {
            const session = store.openSession();

            const query = await session.load(id, {
                documentType: User,
                includes: builder => builder
                    .includeRevisions(dateTime)
                    .includeRevisions("changeVector")
                    .includeRevisions("changeVectors")
            });

            const revision = await session.advanced.revisions.get(id, dateTime, User);
            const revision2 = await session.advanced.revisions.get(changeVector, User);

            assertThat(query)
                .isNotNull();
            assertThat(revision)
                .isNotNull();
            assertThat(revision2)
                .isNotNull();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("query_IncludeBuilder_IncludeRevisionBefore", async () => {
        let changeVector: string;

        const id = "users/rhino";

        await testContext.setupRevisions(store, true, 5);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();

            const metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1);

            changeVector = metadatas[0]["@change-vector"];
        }

        const beforeDateTime = new Date();

        await delay(2);

        {
            const session = store.openSession();
            const query = session.query(User)
                .waitForNonStaleResults()
                .include(builder => builder.includeRevisions(beforeDateTime));

            const users = await query.all();

            const revision = await session.advanced.revisions.get(changeVector, User);
            assertThat(users)
                .isNotNull();
            assertThat(revision)
                .isNotNull();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("query_RawQueryChangeVectorInsidePropertyWithIndex", async () => {
        const id = "users/rhino";

        await testContext.setupRevisions(store, true, 5);

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();
        }

        let changeVector: string;

        {
            const session = store.openSession();
            const metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1);

            changeVector = metadatas[0]["@change-vector"];

            await session.advanced.patch(id, "changeVector", changeVector);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = await session.advanced
                .rawQuery("from Users where name = 'Omer' include revisions($p0)", User)
                .addParameter("p0", "changeVector")
                .waitForNonStaleResults()
                .all();

            const revision = await session.advanced.revisions.get(changeVector, User);
            assertThat(revision)
                .isNotNull();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    });

    it("query_RawQueryGetRevisionBeforeDateTime", async () => {
        const id = "user/rhino";

        await testContext.setupRevisions(store, true, 5);

        let changeVector: string;

        {
            const session = store.openSession();
            const user = new User();
            user.name = "Omer";
            await session.store(user, id);
            await session.saveChanges();

            const metadatas = await session.advanced.revisions.getMetadataFor(id);
            assertThat(metadatas)
                .hasSize(1)

            changeVector = metadatas[0]["@change-vector"];
        }

        {
            const session = store.openSession();
            const getRevisionsBefore = new Date();
            const query = await session.advanced.rawQuery("from Users include revisions($p0)", User)
                .addParameter("p0", getRevisionsBefore)
                .waitForNonStaleResults()
                .all();

            const revision = await session.advanced.revisions.get(changeVector, User);

            assertThat(query)
                .isNotNull();
            assertThat(revision)
                .isNotNull();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }
    })
});

class NameIndex extends AbstractJavaScriptIndexCreationTask<User> {
    public constructor() {
        super();

        this.map(User, u => ({
            name: u.name
        }));
    }
}

class User {
    name: string;
    changeVector: string;
    firstRevision: string;
    secondRevision: string;
    thirdRevision: string;
    changeVectors: string[];
}
