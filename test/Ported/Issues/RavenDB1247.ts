import { CONSTANTS, IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class FooDocumentWithIdProperty {
    public id: string;
    public property1: string;
    public property2: number;
}

describe("RavenDB1247", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("document with id property is stored hash symbol in id hash symbol not removed from id", async () => {
        const testDocumentId = "FooDocument/#123";

        const newDocument = {
            id: testDocumentId,
            property1: "ABC",
            property2: 123456,
            [CONSTANTS.Documents.Metadata.KEY]: {
                [CONSTANTS.Documents.Metadata.COLLECTION]: "FooDocumentWithIdProperty"
            }
        };

        await store.getRequestExecutor().execute(new PutDocumentCommand(testDocumentId, null, newDocument));

        const session = store.openSession();
        const fetchedDocument = await session.load(testDocumentId, FooDocumentWithIdProperty);
        assertThat(fetchedDocument).isNotNull();
    });
});
