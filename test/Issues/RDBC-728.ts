import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { assertThat } from "../Utils/AssertExtensions";

describe("RDBC_728", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("customizeDisplayNameWithSpaces", async () => {
        await setup(store);

        const session = store.openSession();

        const suggestionQueryResults = await session.query({collection: "users"})
            .suggestUsing(x => x
                .byField("name", "daniele")
                .withDisplayName("Customized name with spaces"))
            .execute();

        assertThat(suggestionQueryResults["Customized name with spaces"].suggestions)
            .hasSize(2);
        assertThat(suggestionQueryResults["Customized name with spaces"].suggestions[0])
            .isEqualTo("danielle");
    });

    it("customizeDisplayNameWithOutSpaces", async () => {
        await setup(store);

        const session = store.openSession();
        
        const suggestionQueryResults = await session.query({ collection: "users" })
            .suggestUsing(x => x
                .byField("name", "daniele")
                .withDisplayName("CustomizedName"))
            .execute();

        assertThat(suggestionQueryResults["CustomizedName"].suggestions)
            .hasSize(2);
        assertThat(suggestionQueryResults["CustomizedName"].suggestions[0])
            .isEqualTo("danielle");
    });
});

async function setup(store: IDocumentStore) {
    const session = store.openSession();

    const user1 = Object.assign(new User(), {
        name: "dan"
    });

    const user2 = Object.assign(new User(), {
        name: "daniel"
    });

    const user3 = Object.assign(new User(), {
        name: "danielle"
    });

    await session.store(user1);
    await session.store(user2);
    await session.store(user3);
    await session.saveChanges();
}

class User {
    id: string;
    name: string;
}