import assert from "node:assert";
import {
    GetTrafficWatchConfigurationOperation,
    IDocumentStore,
    PutTrafficWatchConfigurationOperation,
    PutTrafficWatchConfigurationParameters
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("TrafficWatchConfigurationTests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("checkDefaultsAndCanSetAndGetTrafficWatchConfiguration", async () => {
        const defaultConfiguration = await store.maintenance.server.send(new GetTrafficWatchConfigurationOperation());

        try {
            assertThat(defaultConfiguration.trafficWatchMode).isEqualTo("Off");
            assertThat(defaultConfiguration.databases).isNull();
            assertThat(defaultConfiguration.statusCodes).isNull();
            assertThat(defaultConfiguration.minimumResponseSizeInBytes).isEqualTo(0);
            assertThat(defaultConfiguration.minimumRequestSizeInBytes).isEqualTo(0);
            assertThat(defaultConfiguration.minimumDurationInMs).isEqualTo(0);
            assertThat(defaultConfiguration.httpMethods).isNull();
            assertThat(defaultConfiguration.changeTypes).isNull();
            assertThat(defaultConfiguration.certificateThumbprints).isNull();

            const configuration1: PutTrafficWatchConfigurationParameters = {
                trafficWatchMode: "Off",
                databases: ["test1", "test2"],
                statusCodes: [200, 404, 500],
                minimumResponseSizeInBytes: 11,
                minimumRequestSizeInBytes: 22,
                minimumDurationInMs: 33,
                httpMethods: ["POST", "GET"],
                changeTypes: ["Queries", "Counters", "BulkDocs"],
                certificateThumbprints: ["0123456789ABCDEF0123456789ABCDEF01234567", "FEDCBA9876543210FEDCBA9876543210FEDCBA98"]
            };

            await store.maintenance.server.send(new PutTrafficWatchConfigurationOperation(configuration1));

            const configuration2 = await store.maintenance.server.send(new GetTrafficWatchConfigurationOperation());

            assertThat(configuration2.trafficWatchMode).isEqualTo(configuration1.trafficWatchMode);
            assert.deepStrictEqual(configuration2.databases, configuration1.databases);
            assert.deepStrictEqual(configuration2.statusCodes, configuration1.statusCodes);
            assertThat(configuration2.minimumResponseSizeInBytes).isEqualTo(configuration1.minimumResponseSizeInBytes);
            assertThat(configuration2.minimumRequestSizeInBytes).isEqualTo(configuration1.minimumRequestSizeInBytes);
            assertThat(configuration2.minimumDurationInMs).isEqualTo(configuration1.minimumDurationInMs);
            assert.deepStrictEqual(configuration2.httpMethods, configuration1.httpMethods);
            assert.deepStrictEqual(configuration2.changeTypes, configuration1.changeTypes);
            assert.deepStrictEqual(configuration2.certificateThumbprints, configuration1.certificateThumbprints);
        } finally {
            await store.maintenance.server.send(new PutTrafficWatchConfigurationOperation(defaultConfiguration));
        }
    });

    it("throwsOnNullParameters", async () => {
        await assertThrows(() => new PutTrafficWatchConfigurationOperation(null),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });
});
