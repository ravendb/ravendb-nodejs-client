import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RavenDB_14311Test", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("invalidQueryWithExtraParenthesesShouldThrowSyntaxErrorNotNre", async () => {
        const session = store.openSession();
        try {
            // note the extra '()' after search(...) - this is invalid RQL syntax.
            // previously this crashed the parser with a bare NullReferenceException (RavenDB-14311),
            // it should now report a readable syntax error instead
            const query = session.advanced.rawQuery<Doc>("from docs where search(StrVal, \"a\")()");

            await assertThrows(async () => await query.all(), err => {
                assertThat(err.message)
                    .contains("Expected a method name before '('");
                assertThat(err.message.includes("NullReferenceException"))
                    .isFalse();
            });
        } finally {
            session.dispose();
        }
    });

    it("validSearchQueryShouldStillWork", async () => {
        const session = store.openSession();
        try {
            // the fix must not reject a legitimate search() call
            const results = await session.advanced
                .rawQuery<Doc>("from docs where search(StrVal, \"a\")")
                .all();

            assertThat(results)
                .hasSize(0);
        } finally {
            session.dispose();
        }
    });
});

class Doc {
    public id: string;
    public strVal: string;
}
