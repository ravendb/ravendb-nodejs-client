import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractMultiMapIndexCreationTask,
    Highlightings,
} from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";

interface ISearchable {
    slug: string;
    title: string;
    content: string;
}

class EventsItem implements ISearchable {
    public id: string;
    public title: string;
    public slug: string;
    public content: string;
}

class SearchResults {
    public result: ISearchable;
    public highlights: string[];
    public title: string;
}

class ContentSearchIndex extends AbstractMultiMapIndexCreationTask {
    public constructor() {
        super();

        this.addMap("docs.eventsItems.Select(doc => new {\n" +
            "    doc = doc,\n" +
            "    slug = Id(doc).ToString().Substring(Id(doc).ToString().IndexOf('/') + 1)\n" +
            "}).Select(this0 => new {\n" +
            "    slug = this0.slug,\n" +
            "    title = this0.doc.title,\n" +
            "    content = this0.doc.content\n" +
            "})");

        this.index("slug", "Search");
        this.store("slug", "Yes");
        this.termVector("slug", "WithPositionsAndOffsets");

        this.index("title", "Search");
        this.store("title", "Yes");
        this.termVector("title", "WithPositionsAndOffsets");

        this.index("content", "Search");
        this.store("content", "Yes");
        this.termVector("content", "WithPositionsAndOffsets");
    }
}

describe("HighlightsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("searchWithHighlights", async () => {
        const q = "session";
        const eventItem = Object.assign(new EventsItem(), {
                slug: "ravendb-indexes-explained",
                title: "RavenDB indexes explained",
                // tslint:disable-next-line:max-line-length
                content: "Itamar Syn-Hershko: Afraid of Map/Reduce? In this session, core RavenDB developer Itamar Syn-Hershko will walk through the RavenDB indexing process, grok it and much more."
            });

        {
            const session = store.openSession();
            await session.store(eventItem);

            await session.saveChanges();
        }

        const index = new ContentSearchIndex();
        await index.execute(store);
        await testContext.waitForIndexing(store);

        {
            const hightlightOpts = {
                fragmentLength: 128,
                fragmentCount: 2,
                preTags: ["<span style='background: yellow'>"],
                postTags: ["</span>"]
            };

            let titleHighlighting: Highlightings;
            let slugHighlighting: Highlightings;
            let contentHighlighting: Highlightings;

            const session = store.openSession();
            const results = await session.query<ISearchable>({ indexName: index.getIndexName() })
                .waitForNonStaleResults()
                .highlight(Object.assign({ fieldName: "title" }, hightlightOpts), _ => titleHighlighting = _)
                .highlight(Object.assign({ fieldName: "slug" }, hightlightOpts), _ => slugHighlighting = _)
                .highlight(Object.assign({ fieldName: "content" }, hightlightOpts), _ => contentHighlighting = _)
                .search("slug", q).boost(15)
                .search("title", q).boost(12)
                .search("content", q)
                .all();

            assert.ok(results.length);
            assert.ok(titleHighlighting);
            assert.ok(slugHighlighting);
            assert.ok(contentHighlighting);

            assert.strictEqual(titleHighlighting.fieldName, "title");
            assert.strictEqual(titleHighlighting.getFragments(eventItem.id).length, 0);

            assert.strictEqual(slugHighlighting.fieldName, "slug");
            assert.strictEqual(slugHighlighting.getFragments(eventItem.id).length, 0);

            assert.strictEqual(contentHighlighting.fieldName, "content");
            const fragments = contentHighlighting.getFragments(eventItem.id);
            assert.strictEqual(fragments.length, 1);
            assert.ok(fragments[0].indexOf(`<span style='background: yellow'>session</span>`) !== -1);

            const orderedResults = [];
            for (const searchable of results) {
                const docId = session.advanced.getDocumentId(searchable);

                const highlights = [];

                let title = null;
                const titles = titleHighlighting.getFragments(docId);
                if (titles.length === 1) {
                    title = titles[0];
                } else {
                    highlights.push(...titleHighlighting.getFragments(docId));
                }

                highlights.push(...slugHighlighting.getFragments(docId));
                highlights.push(...contentHighlighting.getFragments(docId));

                const searchResults = new SearchResults();
                searchResults.result = searchable;
                searchResults.highlights = highlights;
                searchResults.title = title;
                orderedResults.push(searchResults);

                assertThat(orderedResults)
                    .hasSize(1);
                assertThat(orderedResults[0].highlights)
                    .hasSize(1);

                const firstHighlight = orderedResults[0].highlights[0];
                assertThat(firstHighlight)
                    .contains(">session<");

                assertThat(orderedResults[0].result.title)
                    .isEqualTo("RavenDB indexes explained");
            }
        }
    });
});
