import {
    IDocumentStore,
    GetLogsConfigurationOperation,
    SetLogsConfigurationOperation,
    LogLevel
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.0") ? describe : describe.skip)("RavenDB_11440", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetLogsConfigurationAndChangeLogMode", async () => {
        const configuration1 = await store.maintenance.server.send(new GetLogsConfigurationOperation());

        const newMinLevel: LogLevel = configuration1.logs.currentMinLevel === "Debug" ? "Trace" : "Debug";

        try {
            await store.maintenance.server.send(new SetLogsConfigurationOperation({
                logs: { minLevel: newMinLevel }
            }));

            const configuration2 = await store.maintenance.server.send(new GetLogsConfigurationOperation());

            assertThat(configuration2.logs.currentMinLevel)
                .isEqualTo(newMinLevel);

            assertThat(configuration2.logs.minLevel)
                .isEqualTo(configuration1.logs.minLevel);
            assertThat(configuration2.logs.archiveAboveSizeInMb)
                .isEqualTo(configuration1.logs.archiveAboveSizeInMb);
            assertThat(configuration2.logs.enableArchiveFileCompression)
                .isEqualTo(configuration1.logs.enableArchiveFileCompression);
            assertThat(configuration2.logs.maxArchiveDays)
                .isEqualTo(configuration1.logs.maxArchiveDays);
            assertThat(configuration2.logs.maxArchiveFiles)
                .isEqualTo(configuration1.logs.maxArchiveFiles);
            assertThat(configuration2.logs.path)
                .isEqualTo(configuration1.logs.path);
        } finally {
            await store.maintenance.server.send(new SetLogsConfigurationOperation({
                logs: { minLevel: configuration1.logs.currentMinLevel }
            }));
        }
    });
});
