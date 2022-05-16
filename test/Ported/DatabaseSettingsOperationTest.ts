import { IDocumentStore, ToggleDatabasesStateOperation } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import {
    PutDatabaseSettingsOperation
} from "../../src/ServerWide/Operations/Configuration/PutDatabaseSettingsOperation";
import {
    GetDatabaseSettingsOperation
} from "../../src/ServerWide/Operations/Configuration/GetDatabaseSettingsOperation";
import { assertThat } from "../Utils/AssertExtensions";
import { DatabaseSettings } from "../../src/ServerWide/Operations/Configuration/DatabaseSettings";


describe("DatabaseSettingsOperationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("checkIfConfigurationSettingsIsEmpty", async () => {
        await checkIfOurValuesGotSaved(store, {});
    });

    it("changeSingleSettingKeyOnServer", async () => {
        const settings = {
            "Storage.PrefetchResetThresholdInGb": "10"
        }
        await putConfigurationSettings(store, settings);
        await checkIfOurValuesGotSaved(store, settings);
    });

    it("changeMultipleSettingsKeysOnServer", async () => {
        const settings = {
            "Storage.PrefetchResetThresholdInGb": "10",
            "Storage.TimeToSyncAfterFlushInSec": "35",
            "Tombstones.CleanupIntervalInMin": "10"
        };

        await putConfigurationSettings(store, settings);
        await checkIfOurValuesGotSaved(store, settings);
    })

    async function putConfigurationSettings(store: IDocumentStore, settings: Record<string, string>) {
        await store.maintenance.send(new PutDatabaseSettingsOperation(store.database, settings));
        await store.maintenance.server.send(new ToggleDatabasesStateOperation(store.database, true));
        await store.maintenance.server.send(new ToggleDatabasesStateOperation(store.database, false));
    }

    async function getConfigurationSettings(store: IDocumentStore): Promise<DatabaseSettings> {
        const settings = await store.maintenance.send(new GetDatabaseSettingsOperation(store.database));
        assertThat(settings)
            .isNotNull();
        return settings;
    }

    async function checkIfOurValuesGotSaved(store: IDocumentStore, data: Record<string, string>) {
        const settings = await getConfigurationSettings(store);

        Object.keys(data).forEach(key => {
            const configurationValue = settings.settings[key];
            assertThat(configurationValue)
                .isNotNull();
            assertThat(configurationValue)
                .isEqualTo(data[key]);
        })
    }

});
