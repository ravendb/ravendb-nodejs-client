import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class Address {
    public line1: unknown;
}

class Company {
    public address: Address;
}

describe("RavenDB_4607", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can change object to double", async () => {
        {
            const session = store.openSession();
            const test = new Address();
            test.line1 = "";
            await session.store(test, "address");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load("address", Address);
            company.line1 = 1.5;

            await session.saveChanges();
        }
    });

    it("can change nested object to double", async () => {
        {
            const session = store.openSession();
            const test = new Company();
            test.address = new Address();
            test.address.line1 = "1.5";
            await session.store(test, "company");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load("company", Company);
            company.address.line1 = 1.5;

            await session.saveChanges();
        }
    });
});
