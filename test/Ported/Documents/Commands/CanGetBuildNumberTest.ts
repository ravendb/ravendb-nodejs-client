import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import { IDocumentStore } from "../../../../src";
import { GetBuildNumberOperation } from "../../../../src/ServerWide/Operations/GetBuildNumberOperation";
import { assertThat } from "../../../Utils/AssertExtensions";

describe("CanGetBuildNumberTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetBuildNumber", async () => {
        const buildNumber = await store.maintenance.server.send(new GetBuildNumberOperation());

        assertThat(buildNumber)
            .isNotNull();
        assertThat(buildNumber.productVersion)
            .isNotNull();
    });

});