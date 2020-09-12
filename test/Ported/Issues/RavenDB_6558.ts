import { assertThat } from "../../Utils/AssertExtensions";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractMultiMapIndexCreationTask,
    Highlightings,
} from "../../../src";

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
    private result: ISearchable;
    private highlights: string[];
    private title: string;
}

class ContentSearchIndex extends AbstractMultiMapIndexCreationTask {
    public constructor() {
        super();
        this.addMap("docs.EventsItems.Select(doc => new {\n" +
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

describe("RavenDB-6558", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("canUseDifferentPreAndPostTagsPerField", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new EventsItem(), { 
                slug: "ravendb-indexes-explained",
                title: "RavenDB indexes explained",
                // tslint:disable-next-line:max-line-length
                content: "Itamar Syn-Hershko: Afraid of Map/Reduce? In this session, core RavenDB developer Itamar Syn-Hershko will walk through the RavenDB indexing process, grok it and much more."
            }), "items/1");
            await session.saveChanges();
        }

        const index = new ContentSearchIndex();
        await index.execute(store);
        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let titleHighlighting: Highlightings;
            let contentHighlighting: Highlightings;
            const results = await session.query({ indexName: index.getIndexName() })
                .waitForNonStaleResults()
                .highlight({
                    fieldName: "title",
                    fragmentLength: 128,
                    fragmentCount: 2,
                    preTags: ["***"],
                    postTags: ["***"]
                }, _ => titleHighlighting = _)
                .highlight({
                    fieldName: "content",
                    fragmentLength: 128,
                    fragmentCount: 2,
                    preTags: ["^^^"],
                    postTags: ["^^^"]
                }, _ => contentHighlighting = _)
                .search("title", "RavenDB").boost(12)
                .search("content", "RavenDB")
                .all();

            assertThat(titleHighlighting.getFragments("items/1")[0])
                .contains("***");
            assertThat(contentHighlighting.getFragments("items/1")[0])
                .contains("^^^");
        }
    });
});
