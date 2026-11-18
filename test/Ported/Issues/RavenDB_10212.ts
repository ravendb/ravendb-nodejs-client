import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { milliseconds } from "date-fns";

describe("RavenDB_10212", function () {

    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    it("canSetRequestTimeoutInConventions", async () => {
        const timeout1 = milliseconds({ seconds: 55 });
        const timeout2 = milliseconds({ seconds: 33 });

        store = await testContext.getDocumentStore();

        assertThat(store.conventions.requestTimeout)
            .isUndefined();
        assertThat(store.getRequestExecutor().defaultTimeout)
            .isUndefined();

        await disposeTestDocumentStore(store);

        testContext.customizeStore = async s => {
            s.conventions.requestTimeout = timeout1;
        };
        store = await testContext.getDocumentStore();

        assertThat(store.conventions.requestTimeout)
            .isEqualTo(timeout1);
        assertThat(store.getRequestExecutor().defaultTimeout)
            .isEqualTo(timeout1);

        const scope = store.requestTimeout(timeout2);
        try {
            assertThat(store.getRequestExecutor().defaultTimeout)
                .isEqualTo(timeout2);
            assertThat(store.getRequestExecutor("other").defaultTimeout)
                .isEqualTo(timeout1);
        } finally {
            scope.dispose();
        }

        assertThat(store.getRequestExecutor().defaultTimeout)
            .isEqualTo(timeout1);
    });
});
