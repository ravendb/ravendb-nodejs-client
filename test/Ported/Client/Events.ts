import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("Events", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeUsers(...names: string[]) {
        const session = store.openSession();
        for (let i = 0; i < names.length; i++) {
            await session.store(Object.assign(new User(), { name: names[i] }), "users/" + (i + 1));
        }
        await session.saveChanges();
    }

    it("before store listener", async () => {
        store.addSessionListener("beforeStore", event => {
            const entity = event.getEntity();
            if (entity instanceof User) {
                entity.count = 1000;
            }

            event.getDocumentMetadata()["Nice"] = "true";
        });

        {
            const newSession = store.openSession();
            await newSession.store(Object.assign(new User(), { name: "Toli", count: 1 }), "users/1");

            newSession.advanced.on("beforeStore", event => {
                const entity = event.getEntity();
                if (entity instanceof User) {
                    entity.lastName = "ravendb";
                }
            });

            assertThat(Object.keys(newSession.advanced.whatChanged())).hasSize(1);
            await newSession.saveChanges();
        }

        {
            const newSession = store.openSession();
            const user = await newSession.load("users/1", User);
            assertThat(user.count).isEqualTo(1000);
            assertThat(user.lastName).isEqualTo("ravendb");
            user.age = 3;
            await newSession.saveChanges();
        }
    });

    it("before store session listener with change inside", async () => {
        await storeUsers("Foo");

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Bar" }), "users/2");
            const user1 = await session.load("users/1", User);

            session.advanced.on("beforeStore", () => {
                user1.name = "Grisha";
            });

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user1 = await session.load("users/1", User);
            assertThat(user1).isNotNull();
            assertThat(user1.name).isEqualTo("Grisha");

            const user2 = await session.load("users/2", User);
            assertThat(user2).isNotNull();
            assertThat(user2.name).isEqualTo("Bar");
        }
    });

    it("before delete session listener with delete inside", async () => {
        await storeUsers("Foo", "Bar");

        {
            const session = store.openSession();
            const user2 = await session.load("users/2", User);
            const deletesInside: Promise<void>[] = [];
            session.advanced.on("beforeDelete", event => {
                deletesInside.push(event.session.delete(user2));
            });

            const user1 = await session.load("users/1", User);
            await session.delete(user1);
            await session.saveChanges();
            await Promise.all(deletesInside);
        }

        {
            const session = store.openSession();
            const user1 = await session.load("users/1", User);
            assertThat(user1).isNull();

            const user2 = await session.load("users/2", User);
            assertThat(user2).isNull();
        }
    });
});
