import assert from "node:assert";
import {
    DeleteCommandData,
    IDocumentStore,
    PutCommandDataWithJson,
    PutDocumentCommand
} from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../../Utils/AssertExtensions.js";
import { Company, User } from "../../../Assets/Entities.js";

describe("Advanced", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeJohn() {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { id: "users/1", name: "John" }));
        await session.saveChanges();
    }

    it("can use evict", async () => {
        await storeJohn();

        const session = store.openSession();
        assertThat(session.advanced.numberOfRequests).isEqualTo(0);

        await session.load("users/1", User);
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);

        const user = await session.load("users/1", User);
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);

        session.advanced.evict(user);

        await session.load("users/1", User);
        assertThat(session.advanced.numberOfRequests).isEqualTo(2);
    });

    it("can use clear", async () => {
        await storeJohn();

        const session = store.openSession();
        assertThat(session.advanced.numberOfRequests).isEqualTo(0);

        await session.load("users/1", User);
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);

        await session.load("users/1", User);
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);

        session.advanced.clear();

        await session.load("users/1", User);
        assertThat(session.advanced.numberOfRequests).isEqualTo(2);
    });

    it("can use is loaded", async () => {
        await storeJohn();

        const session = store.openSession();
        assertThat(session.advanced.isLoaded("users/1")).isFalse();

        await session.load("users/1", User);

        assertThat(session.advanced.isLoaded("users/1")).isTrue();
        assertThat(session.advanced.isLoaded("users/2")).isFalse();

        session.advanced.clear();

        assertThat(session.advanced.isLoaded("users/1")).isFalse();
    });

    it("can get document metadata", async () => {
        const companyId = "companies/1";
        const attrKey = "SetDocumentMetadataTestKey";
        const attrVal = "SetDocumentMetadataTestValue";

        await store.getRequestExecutor().execute(new PutDocumentCommand(companyId, null, {
            "@metadata": { [attrKey]: attrVal }
        }));

        const session = store.openSession();
        const company = await session.load(companyId, Company);
        const result = session.advanced.getMetadataFor(company);
        assertThat(result).isNotNull();
        assertThat(result[attrKey]).isEqualTo(attrVal);
    });

    it("can use max number of requests per session", async () => {
        const session = store.openSession();
        session.advanced.maxNumberOfRequestsPerSession = 2;

        const company = new Company();
        await session.store(company);
        await session.saveChanges();
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);

        company.name = "1";
        await session.store(company);
        await session.saveChanges();
        assertThat(session.advanced.numberOfRequests).isEqualTo(2);

        company.name = "2";
        await session.store(company);
        await assertThrows(() => session.saveChanges(), err => {
            assertThat(err.name).isEqualTo("InvalidOperationException");
        });
    });

    it("can get etag for", async () => {
        await store.getRequestExecutor().execute(new PutDocumentCommand("companies/1", null, {}));

        const session = store.openSession();
        const company = await session.load("companies/1", Company);
        const firstEntry = session.advanced.getChangeVectorFor(company).split(",")[0];
        const etag = firstEntry.split(":")[1].split("-")[0];
        assertThat(etag).isEqualTo("1");
    });

    it("can use defer", async () => {
        const session = store.openSession();
        session.advanced.defer(
            new PutCommandDataWithJson("company1", null, null, { Name: "company 1" }, "None"),
            new PutCommandDataWithJson("company2", null, null, { Name: "company 2" }, "None"));
        session.advanced.defer(new DeleteCommandData("company1", null));

        await session.saveChanges();

        assert.strictEqual(await session.load("company1", Company), null);
        assertThat(await session.load("company2", Company)).isNotNull();
    });
});
