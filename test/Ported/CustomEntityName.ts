import { DocumentConventions, ObjectTypeDescriptor } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat } from "../Utils/AssertExtensions.js";

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
});

class User {
    public id: string;
    public carId: string;
}

class Car {
    public id: string;
    public manufacturer: string;
}
