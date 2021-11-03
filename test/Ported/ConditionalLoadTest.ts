import { IDocumentStore } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { User } from "../Assets/Entities";
import { assertThat, assertThrows } from "../Utils/AssertExtensions";

describe("ConditionalLoadTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("conditionalLoad_CanGetDocumentById", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        let cv: string;

        {
            const newSession = store.openSession();
            const user = await newSession.load("users/1", User);
            cv = newSession.advanced.getChangeVectorFor(user);
            assertThat(user)
                .isNotNull();
            assertThat(user.name)
                .isEqualTo("RavenDB");
            user.name = "RavenDB 5.1";
            await newSession.saveChanges();
        }

        {
            const newestSession = store.openSession();
            const user = await newestSession.advanced.conditionalLoad("users/1", cv, User);
            assertThat(user.entity.name)
                .isEqualTo("RavenDB 5.1");
            assertThat(user.changeVector)
                .isNotNull()
                .isNotEqualTo(cv);
        }
    })

    it("conditionalLoad_GetNotModifiedDocumentByIdShouldReturnNull", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        let cv: string;

        {
            const newSession = store.openSession();
            const user = await newSession.load("users/1", User);
            assertThat(user)
                .isNotNull();
            assertThat(user.name)
                .isEqualTo("RavenDB");
            user.name = "RavenDB 5.1";
            await newSession.saveChanges();

            cv = newSession.advanced.getChangeVectorFor(user);
        }

        {
            const newestSession = store.openSession();
            const user = await newestSession.advanced.conditionalLoad("users/1", cv, User);
            assertThat(user.entity)
                .isNull();
            assertThat(user.changeVector)
                .isEqualTo(cv);
        }
    });

    it("conditionalLoad_NonExistsDocumentShouldReturnNull", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        let cv: string;

        {
            const newSession = store.openSession();
            const user = await newSession.load("users/1", User);
            assertThat(user)
                .isNotNull();
            assertThat(user.name)
                .isEqualTo("RavenDB");

            user.name = "RavenDB 5.1";

            await newSession.saveChanges();

            cv = newSession.advanced.getChangeVectorFor(user);
        }

        {
            const newestSession = store.openSession();
            await assertThrows(() => newestSession.advanced.conditionalLoad("users/2", null, User), err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
            });

            const result = await newestSession.advanced.conditionalLoad("users/2", cv, User);
            assertThat(result.entity)
                .isNull();
            assertThat(result.changeVector)
                .isNull();

            assertThat(newestSession.advanced.isLoaded("users/2"))
                .isTrue();

            const expected = newestSession.advanced.numberOfRequests;
            await newestSession.load("users/2", User);

            assertThat(newestSession.advanced.numberOfRequests)
                .isEqualTo(expected);
        }
    });
});