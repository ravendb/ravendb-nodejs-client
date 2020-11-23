import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

export abstract class Identity {
    public id: string;
}

export class Data extends Identity {

    public body: string;
    public whitespaceAnalyzerField: string;
    public personId: string;

    constructor(body?: string) {
        super();
        this.body = body;
    }
}

export class DataWithIntegerId extends Identity {
    public body: string;
}

export class ComplexData {
    public id: string;
    public property: ComplexProperty;
}

export class ComplexProperty {
    public body: string;
}

import {
    AbstractJavaScriptIndexCreationTask,
    IDocumentStore,
} from "../../../src";
import { MoreLikeThisOptions } from "../../../src/Documents/Queries/MoreLikeThis/MoreLikeThisOptions";
import { MoreLikeThisStopWords } from "../../../src/Documents/Queries/MoreLikeThis/MoreLikeThisStopWords";

export class DataIndex extends AbstractJavaScriptIndexCreationTask<Data, Pick<Data, "body" | "whitespaceAnalyzerField">> {

    constructor(termVector: boolean = true, store: boolean = false) {
        super();

        this.map(Data, doc => {
            return {
                body: doc.body,
                whitespaceAnalyzerField: doc.whitespaceAnalyzerField
            }
        });

        this.analyze("body", "Lucene.Net.Analysis.Standard.StandardAnalyzer");
        this.analyze("whitespaceAnalyzerField", "Lucene.Net.Analysis.WhitespaceAnalyzer");

        if (store) {
            this.store("body", "Yes");
            this.store("whitespaceAnalyzerField", "Yes");
        }

        if (termVector) {
            this.termVector("body", "Yes");
            this.termVector("whitespaceAnalyzerField", "Yes");
        }
    }
}

export class ComplexDataIndex
    extends AbstractJavaScriptIndexCreationTask<ComplexData, Pick<ComplexData, "property"> & Pick<ComplexProperty, "body">> {

    constructor() {
        super();

        this.map(ComplexData, doc => {
            return {
                property: doc.property,
                body: doc.property.body
            }
        });

        this.index("body", "Search");
    }
}

describe("MoreLikeThisTests", function () {

    const getLorem = (numWords: number) => {
        // noinspection SpellCheckingInspection
        const theLorem = "Morbi nec purus eu libero interdum laoreet Nam metus quam posuere in elementum eget" +
            " egestas eget justo Aenean orci ligula ullamcorper nec convallis non placerat nec lectus Quisque " +
            "convallis porta suscipit Aliquam sollicitudin ligula sit amet libero cursus egestas Maecenas nec " +
            " mauris neque at faucibus justo Fusce ut orci neque Nunc sodales pulvinar lobortis Praesent dui" +
            " tellus fermentum sed faucibus nec faucibus non nibh Vestibulum adipiscing porta purus ut varius" +
            " mi pulvinar eu Nam sagittis sodales hendrerit Vestibulum et tincidunt urna Fusce lacinia" +
            " nisl at luctus lobortis lacus quam rhoncus risus a posuere nulla lorem at nisi Sed non erat" +
            " nisl Cras in augue velit a mattis ante Etiam lorem dui elementum eget facilisis vitae " +
            " viverra sit amet tortor Suspendisse potenti Nunc egestas accumsan justo" +
            " viverra viverra Sed faucibus ullamcorper mauris ut pharetra ligula ornare eget Donec suscipit luctus" +
            " rhoncus Pellentesque eget justo ac nunc tempus consequat Nullam fringilla egestas leo" +
            " Praesent condimentum laoreet magna vitae luctus sem cursus sed Mauris massa purus suscipit" +
            " ac malesuada a accumsan non neque Proin et libero vitae quam ultricies rhoncus Praesent" +
            " urna neque molestie et suscipit vestibulum iaculis" +
            " ac nulla Integer portanulla vel leo ullamcorper eu rhoncus dui semper Donec dictum dui";

        const loremArray = theLorem.split(" ");

        let output = "";

        for (let i = 0; i < numWords; i++) {
            const rnd = Math.floor((loremArray.length - 1) * Math.random());
            output += loremArray[rnd] + " ";
        }
        return output;
    };

    const assertMoreLikeThisHasMatchesFor = async (indexName: string, storeToUse: IDocumentStore,
                                                   documentKey: string) => {
        const session = storeToUse.openSession();

        const options = {
            fields: ["body"]
        } as MoreLikeThisOptions;

        const list = await session
            .query<any>({ indexName })
            .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", documentKey)).withOptions(options))
            .all();

        assert.ok(list.length > 0);
    };

    const getDataList = () => {
        return [
            new Data("This is a test. Isn't it great? I hope I pass my test!"),
            new Data("I have a test tomorrow. I hate having a test"),
            new Data("Cake is great."),
            new Data("This document has the word test only once"),
            new Data("test"),
            new Data("test"),
            new Data("test"),
            new Data("test")
        ];
    };

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can get results using term vectors", async () => {
        let id: string;
        {
            const session = store.openSession();

            await new DataIndex(true, false).execute(store);

            const list = getDataList();
            for (const datum of list) {
                await session.store(datum);
            }
            await session.saveChanges();

            id = session.advanced.getDocumentId(list[0]);
            await testContext.waitForIndexing(store);
        }

        await assertMoreLikeThisHasMatchesFor("DataIndex", store, id);
    });

    it("can get results using term vectors with document query", async () => {
        let id: string;
        {
            const session = store.openSession();

            await new DataIndex(true, false).execute(store);

            const list = getDataList();
            for (const datum of list) {
                await session.store(datum);
            }
            await session.saveChanges();

            id = session.advanced.getDocumentId(list[0]);
            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();

            const options = {
                fields: ["body"]
            } as MoreLikeThisOptions;

            const list = await session
                .query<any>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", id)).withOptions(options))
                .all();

            assert.ok(list.length > 0);
        }
    });

    it("can get results using term vectors lazy", async () => {
        let id: string;
        {
            const session = store.openSession();

            await new DataIndex(true, false).execute(store);

            const list = getDataList();
            for (const datum of list) {
                await session.store(datum);
            }
            await session.saveChanges();

            id = session.advanced.getDocumentId(list[0]);
            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();

            const options = {
                fields: ["body"]
            } as MoreLikeThisOptions;

            const lazyList = await session
                .query<any>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", id)).withOptions(options))
                .lazily();

            const list = await lazyList.getValue();

            assert.ok(list.length > 0);
        }
    });

    it("can get results using storage", async () => {
        let id: string;
        {
            const session = store.openSession();

            await new DataIndex(false, true).execute(store);

            const list = getDataList();
            for (const datum of list) {
                await session.store(datum);
            }
            await session.saveChanges();

            id = session.advanced.getDocumentId(list[0]);
            await testContext.waitForIndexing(store);
        }

        await assertMoreLikeThisHasMatchesFor("DataIndex", store, id);
    });

    it("can get results using term vectors and storage", async () => {
        let id: string;
        {
            const session = store.openSession();

            await new DataIndex(true, true).execute(store);

            const list = getDataList();
            for (const datum of list) {
                await session.store(datum);
            }
            await session.saveChanges();

            id = session.advanced.getDocumentId(list[0]);
            await testContext.waitForIndexing(store);
        }

        await assertMoreLikeThisHasMatchesFor("DataIndex", store, id);
    });

    it("test with lots of random data", async () => {
        const key = "data/1-A";
        {
            const session = store.openSession();

            await new DataIndex().execute(store);

            for (let i = 0; i < 100; i++) {
                const data = new Data();
                data.body = getLorem(200);
                await session.store(data);
            }

            await session.saveChanges();
            await testContext.waitForIndexing(store);
        }

        await assertMoreLikeThisHasMatchesFor("DataIndex", store, key);
    });

    it("do not pass field names", async () => {
        const key = "data/1-A";

        {
            const session = store.openSession();

            await new DataIndex().execute(store);

            for (let i = 0; i < 10; i++) {
                const data = new Data();
                data.body = "Body" + i;
                data.whitespaceAnalyzerField = "test test";
                await session.store(data);
            }

            await session.saveChanges();
            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();
            const list = await session
                .query<any>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", key)))
                .all();

            assert.ok(list.length > 0);
        }
    });

    it("each field should use correct analyzer", async () => {
        const key1 = "data/1-A";

        {
            const session = store.openSession();
            await new DataIndex().execute(store);

            for (let i = 0; i < 10; i++) {
                const data = new Data();
                data.whitespaceAnalyzerField = "bob@hotmail.com hotmail";
                await session.store(data);
            }

            await session.saveChanges();
            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();
            const options = {
                minimumTermFrequency: 2,
                minimumDocumentFrequency: 5
            } as MoreLikeThisOptions;

            const list = await session
                .query<any>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", key1)).withOptions(options))
                .all();

            assert.ok(list.length === 0);
        }

        const key2 = "data/11-A";

        {
            const session = store.openSession();
            await new DataIndex().execute(store);

            for (let i = 0; i < 10; i++) {
                const data = new Data();
                data.whitespaceAnalyzerField = "bob@hotmail.com bob@hotmail.com";
                await session.store(data);
            }

            await session.saveChanges();
            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();
            const list = await session
                .query<any>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", key2)))
                .all();

            assert.ok(list.length > 0);
        }
    });

    it("can use min doc freq param", async () => {
        const key = "data/1-A";

        {
            const session = store.openSession();

            await new DataIndex().execute(store);

            const factory = text => {
                const data = new Data();
                data.body = text;
                return session.store(data);
            };

            await factory("This is a test. Isn't it great? I hope I pass my test!");
            await factory("I have a test tomorrow. I hate having a test");
            await factory("Cake is great.");
            await factory("This document has the word test only once");

            await session.saveChanges();

            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();
            const options = {
                fields: ["body"],
                minimumDocumentFrequency: 2
            } as MoreLikeThisOptions;

            const list = await session
                .query<any>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", key)).withOptions(options))
                .all();

            assert.ok(list.length > 0);
        }
    });

    it("can use boost param", async () => {
        const key = "data/1-A";

        {
            const session = store.openSession();

            await new DataIndex().execute(store);

            const factory = text => {
                const data = new Data();
                data.body = text;
                return session.store(data);
            };

            await factory("This is a test. Isn't it great? I hope I pass my test!");
            await factory("Cake is great.");
            await factory("I have a test tomorrow.");

            await session.saveChanges();

            await testContext.waitForIndexing(store);
        }

        {
            const session = store.openSession();

            const options = {
                fields: ["body"],
                minimumWordLength: 3,
                minimumDocumentFrequency: 1,
                minimumTermFrequency: 2,
                boost: true
            } as MoreLikeThisOptions;

            const list = await session
                .query<Data>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", key)).withOptions(options))
                .all();

            assert.ok(list.length > 0);

            assert.strictEqual(list[0].body, "I have a test tomorrow.");
        }
    });

    it("can use stop words", async () => {
        const key = "data/1-A";

        await new DataIndex().execute(store);

        {
            const session = store.openSession();

            const factory = text => {
                const data = new Data();
                data.body = text;
                return session.store(data);
            };

            await factory("This is a test. Isn't it great? I hope I pass my test!");
            await factory("I should not hit this document. I hope");
            await factory("Cake is great.");
            await factory("This document has the word test only once");
            await factory("test");
            await factory("test");
            await factory("test");
            await factory("test");

            const stopWords = new MoreLikeThisStopWords();
            stopWords.id = "Config/Stopwords";
            stopWords.stopWords = ["I", "A", "Be"];
            await session.store(stopWords);

            await session.saveChanges();
            await testContext.waitForIndexing(store);
        }

        const indexName = new DataIndex().getIndexName();

        {
            const session = store.openSession();
            const options = {
                minimumTermFrequency: 2,
                minimumDocumentFrequency: 1,
                stopWordsDocumentId: "Config/Stopwords"
            } as MoreLikeThisOptions;

            const list = await session
                .query<Data>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(b => b.whereEquals("id()", key)).withOptions(options))
                .all();

            assert.strictEqual(list.length, 5);
        }
    });

    it("can make dynamic document queries", async () => {
        await new DataIndex().execute(store);

        {
            const session = store.openSession();
            const list = getDataList();
            for (const item of list) {
                await session.store(item);
            }
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const options = {
                fields: ["body"],
                minimumTermFrequency: 1,
                minimumDocumentFrequency: 1
            } as MoreLikeThisOptions;

            const list = await session
                .query<Data>({ indexName: "DataIndex" })
                .moreLikeThis(f => f.usingDocument(`{"body": "A test"}`).withOptions(options))
                .all();

            assert.strictEqual(list.length, 7);
        }
    });

    it("can make dynamic document queries with complex properties", async () => {
        await new ComplexDataIndex().execute(store);

        {
            const session = store.openSession();
            const complexProperty = new ComplexProperty();
            complexProperty.body = "test";

            const complexData = new ComplexData();
            complexData.property = complexProperty;

            await session.store(complexData);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const options = {
                minimumTermFrequency: 1,
                minimumDocumentFrequency: 1
            } as MoreLikeThisOptions;

            const list = await session
                .query<ComplexData>({ indexName: "ComplexDataIndex" })
                .moreLikeThis(f => f.usingDocument(`{ "Property": { "Body": "test" } }`).withOptions(options))
                .all();

            assert.strictEqual(list.length, 1);
        }
    });
});
