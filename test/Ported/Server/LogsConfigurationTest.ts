import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { GetLogsConfigurationOperation } from "../../../src/ServerWide/Operations/Logs/GetLogsConfigurationOperation";
import { assertThat } from "../../Utils/AssertExtensions";
import {
    SetLogsConfigurationOperation,
    SetLogsConfigurationParameters
} from "../../../src/ServerWide/Operations/Logs/SetLogsConfigurationOperation";

describe("LogsConfigurationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetAndSetLogging", async () => {
        let getOperation = new GetLogsConfigurationOperation();

        let logsConfig = await store.maintenance.server.send(getOperation);

        assertThat(logsConfig.currentMode)
            .isEqualTo("None");
        assertThat(logsConfig.mode)
            .isEqualTo("None");

        // now try to set mode to operations and info

        try {
            const parameters: SetLogsConfigurationParameters = {
                mode: "Information"
            };

            const setOperation = new SetLogsConfigurationOperation(parameters);

            await store.maintenance.server.send(setOperation);

            getOperation = new GetLogsConfigurationOperation();

            logsConfig = await store.maintenance.server.send(getOperation);

            assertThat(logsConfig.currentMode)
                .isEqualTo("Information");
            assertThat(logsConfig.mode)
                .isEqualTo("None");
        } finally {
            // try to clean up

            const parameters: SetLogsConfigurationParameters = {
                mode: "Operations"
            };

            await store.maintenance.server.send(new SetLogsConfigurationOperation(parameters));
        }
    });

});
