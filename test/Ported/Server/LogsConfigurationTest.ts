import assert from "node:assert"
import {
    IDocumentStore,
    GetLogsConfigurationOperation,
    SetLogsConfigurationOperation,
    LogFilter,
    LogLevel
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.0") ? describe : describe.skip)("LogsConfigurationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetAndSetLogging", async () => {
        const initialConfig = await store.maintenance.server.send(new GetLogsConfigurationOperation());

        assertThat(initialConfig.logs.path)
            .isNotNull();

        const newMinLevel: LogLevel = initialConfig.logs.currentMinLevel === "Debug" ? "Info" : "Debug";

        try {
            await store.maintenance.server.send(new SetLogsConfigurationOperation({
                logs: { minLevel: newMinLevel }
            }));

            const logsConfig = await store.maintenance.server.send(new GetLogsConfigurationOperation());

            assertThat(logsConfig.logs.currentMinLevel)
                .isEqualTo(newMinLevel);
            assertThat(logsConfig.logs.minLevel)
                .isEqualTo(initialConfig.logs.minLevel);
        } finally {
            await store.maintenance.server.send(new SetLogsConfigurationOperation({
                logs: { minLevel: initialConfig.logs.currentMinLevel }
            }));
        }
    });

    it("canSetLogFilters", async () => {
        const initialConfig = await store.maintenance.server.send(new GetLogsConfigurationOperation());

        const filter: LogFilter = {
            minLevel: "Info",
            maxLevel: "Fatal",
            condition: "contains('${logger}', 'Raven.Server.Documents')",
            action: "Log"
        };

        try {
            await store.maintenance.server.send(new SetLogsConfigurationOperation({
                logs: {
                    minLevel: initialConfig.logs.currentMinLevel,
                    filters: [filter],
                    logFilterDefaultAction: "Ignore"
                }
            }));

            const logsConfig = await store.maintenance.server.send(new GetLogsConfigurationOperation());

            assert.deepStrictEqual(logsConfig.logs.currentFilters, [filter]);
            assertThat(logsConfig.logs.currentLogFilterDefaultAction)
                .isEqualTo("Ignore");
        } finally {
            await store.maintenance.server.send(new SetLogsConfigurationOperation({
                logs: {
                    minLevel: initialConfig.logs.currentMinLevel,
                    filters: initialConfig.logs.currentFilters,
                    logFilterDefaultAction: initialConfig.logs.currentLogFilterDefaultAction
                }
            }));
        }
    });
});
