import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { GetLogsConfigurationOperation } from "../../../src/ServerWide/Operations/Logs/GetLogsConfigurationOperation";
import { LogMode } from "../../../src/ServerWide/Operations/Logs/LogMode";
import { throwError } from "../../../src/Exceptions/index";
import { SetLogsConfigurationOperation } from "../../../src/ServerWide/Operations/Logs/SetLogsConfigurationOperation";
import { TimeUtil } from "../../../src/Utility/TimeUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_11440", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetLogsConfigurationAndChangeMode", async () => {
        const configuration = await store.maintenance.server.send(new GetLogsConfigurationOperation());

        try {
            let modeToSet: LogMode;

            switch (configuration.currentMode) {
                case "None":
                    modeToSet = "Information";
                    break;
                case "Operations":
                    modeToSet = "Information";
                    break;
                case "Information":
                    modeToSet = "None";
                    break;
                default:
                    throwError("InvalidOperationException", "Invalid mode: " + configuration.currentMode);
            }

            const time = 1000 * 24 * 3600 * 1000;

            const setLogsOperation = new SetLogsConfigurationOperation({
                compress: false,
                mode: modeToSet,
                retentionTime: TimeUtil.millisToTimeSpan(time)
            });

            await store.maintenance.server.send(setLogsOperation);

            const configuration2 = await store.maintenance.server.send(new GetLogsConfigurationOperation());

            assertThat(configuration2.currentMode)
                .isEqualTo(modeToSet);
            assertThat(configuration2.retentionTime)
                .isEqualTo(TimeUtil.millisToTimeSpan(time));
            assertThat(configuration2.mode)
                .isEqualTo(configuration.mode);
            assertThat(configuration2.useUtcTime)
                .isEqualTo(configuration.useUtcTime);
        } finally {
            await store.maintenance.server.send(new SetLogsConfigurationOperation({
                retentionTime: configuration.retentionTime,
                mode: configuration.currentMode,
                compress: false
            }))
        }
    });
});
