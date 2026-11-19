import { milliseconds } from "date-fns";
import { DocumentChange, DocumentConventions, IDocumentStore, ObjectTypeDescriptor } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat } from "../Utils/AssertExtensions.js";
import { AsyncQueue } from "../Utils/AsyncQueue.js";

describe("CustomEntityName", function () {

    const getCharactersToTestWithSpecial = () => {
        // RavenDB-25738: the server rejects control characters in a collection name
        // unconditionally (the SupportedFeatures opt-out only relaxes document IDs).
        // These chars are therefore everything the server allows in a collection name
        // and match the C# CustomEntityName test's GetChars().
        const basicChars = [ "a", "-", "'", "\"", "\\", "\b", "\f", "\n", "\r", "\t" ];
        const specialChars = [ "Ā", "Ȁ", "Ѐ", "Ԁ", "؀", "܀", "ऀ", "ਅ", "ଈ", "అ", "ഊ", "ข", "ဉ", "ᄍ", "ሎ", "ጇ", "ᐌ", "ᔎ", "ᘀ", "ᜩ", "ᢹ", "ᥤ", "ᨇ" ];
        return [...basicChars, ...specialChars];
    }

    async function testWhenCollectionAndIdContainSpecialChars(c: string) {
        testContext.customizeStore = async r => {
            r.conventions.findCollectionName = (constructorOrTypeChecker: ObjectTypeDescriptor) => {
                return "Test" + c + DocumentConventions.defaultGetCollectionName(constructorOrTypeChecker);
            }
        };

        const store = await testContext.getDocumentStore();
        try {
            {
                const session = store.openSession();
                const car = new Car();
                car.manufacturer = "BMW";
                await session.store(car);

                const user = new User();
                user.carId = car.id;
                await session.store(user);
                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const results = await session.query({
                    collection: store.conventions.findCollectionName(User),
                    documentType: User
                }).all();
                assertThat(results)
                    .hasSize(1);
            }
        } finally {
            testContext.customizeStore = null;
            await disposeTestDocumentStore(store);
        }
    }

    it("findCollectionName", async () => {
        for (const c of getCharactersToTestWithSpecial()) {
            await testWhenCollectionAndIdContainSpecialChars(c);
        }
    });

    const getCharactersToTest = () => [ "a", "-", "'", "\"", "\\", "\b", "\f", "\n", "\r", "\t" ];

    async function withSpecialCharCollectionStore(c: string, action: (store: IDocumentStore) => Promise<void>) {
        testContext.customizeStore = async r => {
            r.conventions.findCollectionName = (constructorOrTypeChecker: ObjectTypeDescriptor) =>
                "Test" + c + DocumentConventions.defaultGetCollectionName(constructorOrTypeChecker);
        };

        const store = await testContext.getDocumentStore();
        try {
            await action(store);
        } finally {
            testContext.customizeStore = null;
            await disposeTestDocumentStore(store);
        }
    }

    it("findCollectionName when subscribe to api changes", async () => {
        for (const c of getCharactersToTest()) {
            await withSpecialCharCollectionStore(c, async store => {
                const changesList = new AsyncQueue<DocumentChange>();

                const changes = store.changes();
                await changes.ensureConnectedNow();
                const observable = changes.forDocumentsInCollection(User);
                observable.on("data", change => changesList.push(change));
                await observable.ensureSubscribedNow();

                const session = store.openSession();
                await session.store(new User());
                await session.saveChanges();

                assertThat(await changesList.poll(milliseconds({ seconds: 15 }))).isNotNull();
            });
        }
    });

    it("findCollectionName when load with include", async () => {
        for (const c of getCharactersToTest()) {
            await withSpecialCharCollectionStore(c, async store => {
                const user = new User();
                {
                    const session = store.openSession();
                    const car = Object.assign(new Car(), { manufacturer: "BMW" });
                    await session.store(car);
                    user.carId = car.id;
                    await session.store(user);
                    await session.saveChanges();
                }

                {
                    const session = store.openSession();
                    const loadedUser = await session.include("carId").load(user.id, User);

                    assertThat(loadedUser).isNotNull();
                    assertThat(session.advanced.isLoaded(user.carId)).isTrue();
                }
            });
        }
    });
});

class User {
    public id: string;
    public carId: string;
}

class Car {
    public id: string;
    public manufacturer: string;
}
