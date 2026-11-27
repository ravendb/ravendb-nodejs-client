import { IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RavenDB_12568", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("putting blittable with attachments should throw if not exist", async () => {
        const document = {
            CorrelationId: "fNVCxBUxMJrUe6SEK3d3UFU8T15c9vxG",
            DamageOccuredAt: "2018-11-30",
            "@metadata": {
                "@attachments": [
                    {
                        Name: "#{135*707}/lansearch.exe",
                        Hash: "k5sftaB27J00oJVBEguFBbcaUbcUWO8cSezMjrrSIKg=",
                        ContentType: "application/x-msdownload",
                        Size: 5145720
                    }
                ]
            }
        };

        await assertThrows(
            () => store.getRequestExecutor().execute(new PutDocumentCommand("foo/bar", null, document)),
            err => assertThat(err.name).isEqualTo("RavenException"));
    });
});
