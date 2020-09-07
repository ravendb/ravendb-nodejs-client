import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { IndexDefinition } from "../../src/Documents/Indexes/IndexDefinition";
import { IndexFieldOptions } from "../../src/Documents/Indexes/IndexFieldOptions";
import { PutIndexesOperation } from "../../src/Documents/Operations/Indexes/PutIndexesOperation";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { assertThat } from "../Utils/AssertExtensions";

describe("RavenDB_9584", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canChainSuggestions", async () => {
        await setup(store);

        {
            const s = store.openSession();

            const suggestionQueryResult = await s.query<User>({ documentType: User, indexName: "test" })
                .suggestUsing(x => x.byField("name", "Owen"))
                .andSuggestUsing(x => x.byField("company", "Hiberanting"))
                .execute();

            assertThat(suggestionQueryResult["name"].suggestions)
                .hasSize(1);
            assertThat(suggestionQueryResult["name"].suggestions[0])
                .isEqualTo("oren");

            assertThat(suggestionQueryResult["company"].suggestions)
                .hasSize(1);
            assertThat(suggestionQueryResult["company"].suggestions[0])
                .isEqualTo("hibernating");
        }
    });

    it("canUseAliasInSuggestions", async () => {
        await setup(store);

        {
            const s = store.openSession();

            const suggestionQueryResult = await s.query<User>({ documentType: User, indexName: "test" })
                .suggestUsing(x => x.byField("name", "Owen")
                    .withDisplayName("newName"))
                .execute();

            assertThat(suggestionQueryResult["newName"].suggestions)
                .hasSize(1);
            assertThat(suggestionQueryResult["newName"].suggestions[0])
                .isEqualTo("oren");
        }
    });

    it("canUseSuggestionsWithAutoIndex", async () => {
        await setup(store);

        {
            const s = store.openSession();

            const suggestionQueryResult = await s.query<User>(User)
                .suggestUsing(x => x.byField("name", "Owen").withDisplayName("newName"))
                .execute();

            assertThat(suggestionQueryResult["newName"].suggestions)
                .hasSize(1);
            assertThat(suggestionQueryResult["newName"].suggestions[0])
                .isEqualTo("oren");
        }
    });
});

async function setup(store: IDocumentStore) {

    const indexDefinition = new IndexDefinition();
    indexDefinition.name = "test";
    indexDefinition.maps = new Set(["from doc in docs.Users select new { doc.name, doc.company }"]);

    const nameIndexFieldOptions = new IndexFieldOptions();
    nameIndexFieldOptions.suggestions = true;

    const companyIndexFieldOptions= new IndexFieldOptions();
    companyIndexFieldOptions.suggestions = true;

    indexDefinition.fields = {
        "name": nameIndexFieldOptions,
        "company": companyIndexFieldOptions
    };

    const putIndexesOperation = new PutIndexesOperation(indexDefinition);

    const results = await store.maintenance.send(putIndexesOperation);
    assertThat(results)
        .hasSize(1);

    assertThat(results[0].indexName)
        .isEqualTo(indexDefinition.name);

    {
        const session = store.openSession();

        const ayende = Object.assign(new User(), {
            name: "Ayende",
            company: "Hibernating"
        });

        const oren = Object.assign(new User(), {
            name: "Oren",
            company: "HR"
        });

        const john = Object.assign(new User(), {
            name: "John Steinbeck",
            company: "Unknown"
        });

        await session.store(ayende);
        await session.store(oren);
        await session.store(john);
        await session.saveChanges();

        await testContext.waitForIndexing(store);
    }
}

class User {
    id: string;
    name: string;
    company: string;
    title: string;
}