import { randomUUID } from "node:crypto";
import { DocumentStore, IDocumentStore } from "../../../src/index.js";
import { HEADERS } from "../../../src/Constants.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RavenDB_24435", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function assertDatabaseMissingHeaderValue(requestUri: string, expectedDatabaseName: string) {
        const response = await fetch(requestUri);
        const headerValue = response.headers.get(HEADERS.DATABASE_MISSING);
        assertThat(headerValue).isNotNull();
        assertThat(decodeURIComponent(headerValue)).isEqualTo(expectedDatabaseName);
    }

    it("get database record should return URL encoded database name in header when database is missing", async () => {
        const databaseName = `database-møøse-${randomUUID()}`;

        await assertDatabaseMissingHeaderValue(
            `${store.urls[0]}/admin/databases?name=${encodeURIComponent(databaseName)}`, databaseName);

        await assertDatabaseMissingHeaderValue(
            `${store.urls[0]}/topology?name=${encodeURIComponent(databaseName)}`, databaseName);
    });

    it("database does not exist exception carries decoded database name", async () => {
        const databaseName = `database-møøse-${randomUUID()}`;
        const missingStore = new DocumentStore(store.urls, databaseName);
        missingStore.initialize();
        try {
            const session = missingStore.openSession();
            await assertThrows(() => session.load("users/1"), err => {
                assertThat(err.name).isEqualTo("DatabaseDoesNotExistException");
                assertThat(err.message).contains(databaseName);
            });
        } finally {
            missingStore.dispose();
        }
    });
});
