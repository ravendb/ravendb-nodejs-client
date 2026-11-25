import { IDocumentStore } from "../../../src/index.js";
import { MultiGetCommand } from "../../../src/Documents/Commands/MultiGet/MultiGetCommand.js";
import { GetRequest } from "../../../src/Documents/Commands/MultiGet/GetRequest.js";
import { HttpCompressionAlgorithm } from "../../../src/Http/HttpCompressionAlgorithm.js";
import { SucceedRequestEventArgs } from "../../../src/Documents/Session/SessionEvents.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { Company } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_19852", function () {
    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    const cases: [HttpCompressionAlgorithm | null, string][] = [[null, "zstd"], ["Gzip", "gzip"], ["Zstd", "zstd"]];

    for (const [compressionAlgorithm, expectedEncoding] of cases) {
        it(`response from multi get is compressed (${compressionAlgorithm ?? "default"})`, async () => {
            testContext.customizeStore = async s => {
                if (compressionAlgorithm) {
                    s.conventions.httpCompressionAlgorithm = compressionAlgorithm;
                }
            };
            store = await testContext.getDocumentStore();
            testContext.customizeStore = null;

            {
                const session = store.openSession();
                await session.store(Object.assign(new Company(), { name: "a".repeat(10), id: "doc/1" }), "doc/1");
                await session.saveChanges();
            }

            const executor = store.getRequestExecutor();
            const requests: SucceedRequestEventArgs[] = [];
            executor.on("succeedRequest", e => requests.push(e));

            const getRequest = new GetRequest();
            getRequest.url = "/docs";
            getRequest.query = "?id=doc/1";
            const command = new MultiGetCommand(executor, store.conventions, [getRequest]);
            try {
                await executor.execute(command);
            } finally {
                command.dispose();
            }

            const multiGet = requests.find(e => e.url.includes("/multi_get"));
            assertThat(multiGet.response.headers.get("Content-Encoding")).isEqualTo(expectedEncoding);
        });
    }
});
