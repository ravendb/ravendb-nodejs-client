import * as assert from "assert";

import {IDocumentStore, IndexDefinition, IndexFieldOptions, PutIndexesOperation} from "../../../src";
import {disposeTestDocumentStore, testContext} from "../../Utils/TestUtil";
import {SuggestionOptions} from "../../../src/Documents/Queries/Suggestions/SuggestionOptions";
import {Users_ByName} from "../Indexing/IndexesFromClientTest";

describe("SuggestionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can suggest with exact match", async () => {
        await setup();

        {
            const session = store.openSession();

            const options = {
                pageSize: 10
            } as SuggestionOptions;

            const suggestionQueryResult = await session.query({
                documentType: User,
                indexName: "test"
            })
                .suggestUsing(x => x.byField("name", "Oren").withOptions(options))
                .execute();

            assert.strictEqual(suggestionQueryResult.name.suggestions.length, 0);
        }
    });

    it("can suggest using linq", async () => {
        await setup();

        {
            const s = store.openSession();
            const suggestionQueryResult = await s.query({
                documentType: User,
                indexName: "test"
            })
                .suggestUsing(x => x.byField("name", "Owen"))
                .execute();

            assert.strictEqual(suggestionQueryResult.name.suggestions.length, 1);
            assert.strictEqual(suggestionQueryResult.name.suggestions[0], "oren");
        }
    });

    it("can suggest using linq with options", async () => {
        await setup();

        {
            const s = store.openSession();

            const options = {
                accuracy: 0.4
            } as SuggestionOptions;

            const suggestionQueryResult = await s.query({
                documentType: User,
                indexName: "test"
            })
                .suggestUsing(x => x.byField("name", "Orin"))
                .execute();

            assert.strictEqual(suggestionQueryResult.name.suggestions.length, 1);
            assert.strictEqual(suggestionQueryResult.name.suggestions[0], "oren");
        }
    });

    it("can suggest using multiple words", async () => {
        await setup();

        {
            const s = store.openSession();

            const options = {
                accuracy: 0.4,
                distance: "Levenshtein"
            } as SuggestionOptions;

            const suggestionQueryResult = await s.query({
                documentType: User,
                indexName: "test"
            })
                .suggestUsing(x => x.byField("name", "John Steinback").withOptions(options))
                .execute();

            assert.strictEqual(suggestionQueryResult.name.suggestions.length, 1);
            assert.strictEqual(suggestionQueryResult.name.suggestions[0], "john steinbeck");
        }
    });

    it("can suggest with typo", async () => {
        await setup();

        {
            const s = store.openSession();

            const options = {
                accuracy: 0.2,
                pageSize: 10,
                distance: "Levenshtein"
            } as SuggestionOptions;

            const suggestionQueryResult = await s.query({
                documentType: User,
                indexName: "test"
            })
                .suggestUsing(x => x.byField("name", "Oern").withOptions(options))
                .execute();

            assert.strictEqual(suggestionQueryResult.name.suggestions.length, 1);
            assert.strictEqual(suggestionQueryResult.name.suggestions[0], "oren");
        }
    });

    it("can get suggestions", async () => {
        await new Users_ByName().execute(store);

        {
            const s = store.openSession();

            const user1 = new User();
            user1.name = "John Smith";
            await s.store(user1, "users/1");

            const user2 = new User();
            user2.name = "Jack Johnson";
            await s.store(user2, "users/2");

            const user3 = new User();
            user3.name = "Robery Jones";
            await s.store(user3, "users/3");

            const user4 = new User();
            user4.name = "David Jones";
            await s.store(user4, "users/4");

            await s.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();

            const options = {
                accuracy: 0.4,
                pageSize: 5,
                distance: "JaroWinkler",
                sortMode: "Popularity"
            } as SuggestionOptions;

            const suggestionQueryResult = await session.query({
                documentType: User,
                indexName: "Users/ByName"
            })
                .suggestUsing(x => x.byField("name", ["johne", "davi"]).withOptions(options))
                .execute();

            assert.strictEqual(suggestionQueryResult.name.suggestions.length, 5);
            assert.strictEqual(suggestionQueryResult.name.suggestions[0], "john");
            assert.strictEqual(suggestionQueryResult.name.suggestions[1], "jones");
            assert.strictEqual(suggestionQueryResult.name.suggestions[2], "johnson");
            assert.strictEqual(suggestionQueryResult.name.suggestions[3], "david");
            assert.strictEqual(suggestionQueryResult.name.suggestions[4], "jack");
        }
    });

    const setup = async () => {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "test";
        indexDefinition.maps = new Set(["from doc in docs.Users select new { doc.name }"]);

        const indexFieldOptions = new IndexFieldOptions();
        indexFieldOptions.suggestions = true;
        indexDefinition.fields = {
            name: indexFieldOptions
        };

        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        {
            const session = store.openSession();

            const user1 = new User();
            user1.name = "Ayende";

            const user2 = new User();
            user2.name = "Oren";

            const user3 = new User();
            user3.name = "John Steinbeck";

            await session.store(user1);
            await session.store(user2);
            await session.store(user3);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);
    };
});

export class User {
    public id: string;
    public name: string;
    public email: string;
}
