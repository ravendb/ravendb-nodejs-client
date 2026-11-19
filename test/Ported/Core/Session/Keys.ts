import { DocumentStore, IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { Address, Company } from "../../../Assets/Entities.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class UserWithoutId {
    public name: string;
}

class User {
    public id: string;
    public name: string;
}

class TShirt {
    public id: string;
    public manufacturer: string;
    public releaseYear: number;
}

describe("Keys", function () {

    async function withStore(customize: (s: DocumentStore) => void, action: (store: IDocumentStore) => Promise<void>) {
        testContext.customizeStore = async s => customize(s);
        let store: IDocumentStore;
        try {
            store = await testContext.getDocumentStore();
        } finally {
            testContext.customizeStore = null;
        }
        try {
            await action(store);
        } finally {
            await disposeTestDocumentStore(store);
        }
    }

    it("get document id", async () => {
        await withStore(() => {}, async store => {
            {
                const session = store.openSession();
                const user = Object.assign(new UserWithoutId(), { name: "John" });
                await session.store(user);

                assertThat(session.advanced.getDocumentId(user)).isEqualTo("UserWithoutIds/1-A");
            }

            {
                const session = store.openSession();
                const user = Object.assign(new UserWithoutId(), { name: "John" });
                assertThat(session.advanced.getDocumentId(user)).isEqualTo(null);
            }
        });
    });

    it("key generation", async () => {
        await withStore(s => s.conventions.registerIdConvention(User,
            (databaseName, entity: User) => Promise.resolve("def/" + (entity.name ?? ""))), async store => {
            {
                const session = store.openSession();
                const user = Object.assign(new User(), { name: "John" });
                await session.store(user);

                assertThat(user.id).isEqualTo("def/John");
            }

            {
                const session = store.openSession();
                const user = Object.assign(new User(), { name: "Bob" });
                await session.store(user);

                assertThat(user.id).isEqualTo("def/Bob");
            }

            assertThat(await store.conventions.generateDocumentId(store.database, new User())).isEqualTo("def/");
            assertThat(await store.conventions.generateDocumentId(store.database, new User())).isEqualTo("def/");

            assertThat(await store.conventions.generateDocumentId(store.database, new Address())).isEqualTo("addresses/1-A");
            assertThat(await store.conventions.generateDocumentId(store.database, new Company())).isEqualTo("companies/1-A");
        });
    });

    it("key generation on load", async () => {
        await withStore(s => s.conventions.registerIdConvention(TShirt,
            (databaseName, entity: TShirt) => Promise.resolve("ts/" + entity.releaseYear)), async store => {
            {
                const session = store.openSession();
                const shirt = Object.assign(new TShirt(), { manufacturer: "Test1", releaseYear: 1999 });
                await session.store(shirt);
                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const shirt = await session.load("ts/1999", TShirt);
                assertThat(shirt.manufacturer).isEqualTo("Test1");
                assertThat(shirt.releaseYear).isEqualTo(1999);
            }
        });
    });
});
