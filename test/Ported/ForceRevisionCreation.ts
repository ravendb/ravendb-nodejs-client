import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { Company } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";

describe("ForceRevisionCreation", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("forceRevisionCreationForSingleUnTrackedEntityByID", async () => {
        let companyId;

        {
            const session = store.openSession();

            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);

            companyId = company.id;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.revisions.forceRevisionCreationFor(companyId);
            await session.saveChanges();

            const revisionsCount = (await session.advanced.revisions.getFor(companyId, Company)).length; //TODO: review api
            assertThat(revisionsCount)
                .isEqualTo(1);
        }
    });

});
