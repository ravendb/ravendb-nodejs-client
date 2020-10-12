import { DocumentConventions, IDocumentStore, ObjectTypeDescriptor } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { assertThat } from "../Utils/AssertExtensions";

describe("CustomEntityName", function () {

    const getChars = () => {
        const basicChars = [...Array(31).keys()].map(x => {
            return String.fromCodePoint(x + 1);
        });

        const extraChars = [ "a", "-", "'", "\"", "\\", "\b", "\f", "\n", "\r", "\t" ];

        return [...basicChars, ...extraChars];
    };

    const getCharactersToTestWithSpecial = () => {
        const basicChars = getChars();
        const specialChars = [ 'Ā', 'Ȁ', 'Ѐ', 'Ԁ', '؀', '܀', 'ऀ', 'ਅ', 'ଈ', 'అ', 'ഊ', 'ข', 'ဉ', 'ᄍ', 'ሎ', 'ጇ', 'ᐌ', 'ᔎ', 'ᘀ', 'ᜩ', 'ᢹ', 'ᥤ', 'ᨇ' ];
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

            if (c.charCodeAt(0) >= 14 && c.charCodeAt(0) <= 31) {
                return;
            }

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
                const results = await session.query<User>({
                    collection: store.conventions.findCollectionName(User),
                    documentType: User
                }).all();
                assertThat(results)
                    .hasSize(1);
            }
        } finally {
            await disposeTestDocumentStore(store);
            testContext.customizeStore = null;
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
