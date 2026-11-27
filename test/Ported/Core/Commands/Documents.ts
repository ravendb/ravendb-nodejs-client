import {
    DeleteDocumentCommand,
    GetDocumentsCommand,
    IDocumentStore,
    PutDocumentCommand
} from "../../../../src/index.js";
import { HeadDocumentCommand } from "../../../../src/Documents/Commands/HeadDocumentCommand.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

describe("Documents", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const company = {
        name: "testname",
        phone: 1,
        contacts: [{}, {}],
        address1: "To be removed.",
        address2: "Address2",
        "@metadata": { SomeMetadataKey: "SomeMetadataValue" }
    };

    async function execute<T>(command: { result: T }) {
        await store.getRequestExecutor().execute(command as any);
        return command.result;
    }

    async function getById(id: string, metadataOnly = false) {
        const result = await execute(new GetDocumentsCommand({ id, metadataOnly, conventions: store.conventions }));
        return result?.results[0] ?? null;
    }

    it("can put get update and delete document", async () => {
        const putResult = await execute(new PutDocumentCommand("companies/1", null, company));

        assertThat(await getById("companies/1")).isNotNull();

        await execute(new PutDocumentCommand("users/2", null, { name: "testname2" }));

        assertThat(await getById("users/2")).isNotNull();

        const documents = await execute(new GetDocumentsCommand({ start: 0, pageSize: 25, conventions: store.conventions }));
        assertThat(documents.results).hasSize(2);

        const etag = await execute(new HeadDocumentCommand("companies/1", null));
        assertThat(etag).isNotNull();

        const document = await getById("companies/1", true);
        assertThat(Object.keys(document)).hasSize(1);
        assertThat(document["@metadata"]["SomeMetadataKey"]).isEqualTo("SomeMetadataValue");

        await execute(new DeleteDocumentCommand("companies/1", putResult.changeVector));
        assertThat(await getById("companies/1")).isNull();

        await execute(new DeleteDocumentCommand("users/2", null));
        assertThat(await getById("users/2")).isNull();
    });

    it("can skip beyond count for embedded iterator", async () => {
        await execute(new PutDocumentCommand("companies/1", null, company));
        await execute(new PutDocumentCommand("users/2", null, { name: "testname2" }));

        const documents = await execute(new GetDocumentsCommand({ start: 10, pageSize: 25, conventions: store.conventions }));
        assertThat(documents.results.length).isEqualTo(0);
    });
});
