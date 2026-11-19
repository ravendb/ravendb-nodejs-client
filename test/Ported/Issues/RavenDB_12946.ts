import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Book {
    public id: string;
}

class BookReference {
    public bookId: string;
}

class User2 {
    public id: string;
    public collection: BookReference[];
}

class Lookup {
    public id: string;
    public referenceId: string;
}

describe("RavenDB_12946", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("raven should support include more than once on same doc", async () => {
        const numberOfDocs = 335;

        {
            const session = store.openSession();
            const item = Object.assign(new User2(), { id: "Users/1", collection: [] as BookReference[] });
            const lookup = Object.assign(new Lookup(), {
                id: "Lookup/User/ByUsername/Kamranicus",
                referenceId: "Users/1"
            });

            for (let i = 0; i < numberOfDocs; i++) {
                item.collection.push(Object.assign(new BookReference(), { bookId: `Books/${i}` }));
                await session.store(Object.assign(new Book(), { id: `Books/${i}` }));
            }

            await session.store(lookup);
            await session.store(item);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const lookupByUsername = await session.include("referenceId")
                .load("Lookup/User/ByUsername/Kamranicus", Lookup);

            const user = await session.load(lookupByUsername.referenceId, User2);

            const item = await session.include("collection[].bookId")
                .load(user.id, User2);

            const list: Book[] = [];
            for (const bookRef of item.collection) {
                list.push(await session.load(bookRef.bookId, Book));
            }

            assertThat(list).hasSize(335);
            assertThat(session.advanced.numberOfRequests).isEqualTo(2);
        }
    });
});
