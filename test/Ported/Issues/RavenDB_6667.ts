import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_6667", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canQueryWithContainsOnIList", async () => {
        await new Authors_ByNameAndBooks().execute(store);

        {
            const session = store.openSession();

            const book1 = new Book();
            book1.name = "The Witcher";

            await session.store(book1);

            const book2 = new Book();
            book2.name = "Narrenturm";
            await session.store(book2);

            const book3 = new Book();
            book3.name = "Games of thrones";
            await session.store(book3);

            const author1 = new Author();
            author1.name = "Andrzej Sapkowski";
            author1.bookIds = [ book1.id, book2.id ];
            await session.store(author1);

            const author2 = new Author();
            author2.name = "George R. R. Martin";
            author2.bookIds = [ book3.id ];
            await session.store(author2);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const results = await session.query(Authors_ByNameAndBooksResult, Authors_ByNameAndBooks)
                .whereEquals("name", "Andrzej Sapkowski")
                .ofType(Author)
                .all();

            assertThat(results)
                .hasSize(1);
        }

        {
            const session = store.openSession();
            const results = await session.query(Authors_ByNameAndBooksResult, Authors_ByNameAndBooks)
                .whereEquals("name", "Andrzej Sapkowski")
                .orElse()
                .whereEquals("books", "The Witcher")
                .ofType(Author)
                .all();

            assertThat(results)
                .hasSize(1);
        }
    });
});

class Book {
    public id: string;
    public name: string;
}

class Author {
    public id: string;
    public name: string;
    public bookIds: string[];
}

// tslint:disable-next-line:class-name
class Authors_ByNameAndBooksResult {
    public name: string;
    public books: string[];
}

// tslint:disable-next-line:class-name
class Authors_ByNameAndBooks extends AbstractJavaScriptIndexCreationTask<Author, Authors_ByNameAndBooksResult> {
    public constructor() {
        super();

        const { load } = this.mapUtils();

        this.map(Author, author => {
            return {
                name: author.name,
                books: author.bookIds.map(x => load<Book>(x, "books").name)
            }
        })
    }
}