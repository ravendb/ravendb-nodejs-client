import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("ContainsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("queries with contains", async () => {
        {
            const session = store.openSession();
            const userCreator = async (name: string, favs: string[]) => {
                const user = new UserWithFavs();
                user.name = name;
                user.favourites = favs;

                await session.store(user);
            };

            await userCreator("John", ["java", "c#"]);
            await userCreator("Tarzan", ["java", "go"]);
            await userCreator("Jane", ["pascal"]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const pascalOrGoDeveloperNames = await session
                .query(UserWithFavs)
                .containsAny("favourites", ["pascal", "go"])
                .orderBy("name")
                .selectFields<string>("name")
                .all();

            assert.deepStrictEqual(pascalOrGoDeveloperNames, ["Jane", "Tarzan"]);
        }

        {
            const session = store.openSession();
            const javaDevelopers = await session
                .query(UserWithFavs)
                .containsAll("favourites", ["java"])
                .orderBy("name")
                .selectFields<string>("name")
                .all();

            assert.deepStrictEqual(javaDevelopers, ["John", "Tarzan"]);
        }
    });
});

export class UserWithFavs {
    public id: string;
    public name: string;
    public favourites: string[];
}
