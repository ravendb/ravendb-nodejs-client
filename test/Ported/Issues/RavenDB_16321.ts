import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Employee } from "../../Assets/Orders";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import * as StreamUtil from "../../../src/Utility/StreamUtil";

describe("RavenDB_16321Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("streamingOnIndexThatDoesNotExistShouldThrow", async () => {
        const session = store.openSession();

        const query = session.query<Employee>({
            indexName: "Does_Not_Exist",
            documentType: Employee
        })
            .whereEquals("firstName", "Robert");

        await assertThrows(async () => {
            const stream = await session.advanced.stream<Employee>(query);

            stream.on("data", () => {
                // empty
            });

            await StreamUtil.finishedAsync(stream);
        }, err => {
            assertThat(err.name)
                .isEqualTo("IndexDoesNotExistException");
        })
    });
});