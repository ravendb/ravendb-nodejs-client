import {
    ClientConfiguration,
    DocumentStore,
    GetDatabaseRecordOperation,
    GetDatabaseTopologyCommand,
    getAllNodesFromTopology,
    PutClientConfigurationOperation,
    PutServerWideClientConfigurationOperation,
    ReorderDatabaseMembersOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("ClientConfigurationTests", function () {

    let store: DocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    it("change client configuration should update the client", async () => {
        testContext.customizeStore = async s => {
            s.conventions.readBalanceBehavior = "RoundRobin";
            s.conventions.maxNumberOfRequestsPerSession = 99;
        };
        store = await testContext.getDocumentStore();

        const putDatabaseClientConfigDisabled = new PutClientConfigurationOperation({ disabled: true });
        const requestExecutor = store.getRequestExecutor();
        const origin = requestExecutor.conventions.maxNumberOfRequestsPerSession;

        const clientConfiguration = (maxNumberOfRequestsPerSession: number): ClientConfiguration => ({
            readBalanceBehavior: "RoundRobin",
            maxNumberOfRequestsPerSession,
            disabled: false
        });

        const assertWaitForClientConfiguration = async (maxNumberOfRequestsPerSession: number) => {
            const actual = await testContext.waitForValue(async () => {
                const session = store.openSession();
                await session.load("users/1");
                return requestExecutor.conventions.maxNumberOfRequestsPerSession;
            }, maxNumberOfRequestsPerSession);
            assertThat(actual).isEqualTo(maxNumberOfRequestsPerSession);
        };

        try {
            await store.maintenance.send(new PutClientConfigurationOperation(clientConfiguration(100)));
            await assertWaitForClientConfiguration(100);

            await store.maintenance.send(putDatabaseClientConfigDisabled);
            await assertWaitForClientConfiguration(origin);

            await store.maintenance.send(new PutClientConfigurationOperation(clientConfiguration(101)));
            await assertWaitForClientConfiguration(101);
            await store.maintenance.server.send(new PutServerWideClientConfigurationOperation(clientConfiguration(102)));
            await assertWaitForClientConfiguration(101);

            await store.maintenance.send(putDatabaseClientConfigDisabled);
            await assertWaitForClientConfiguration(102);

            await store.maintenance.send(new PutClientConfigurationOperation(clientConfiguration(103)));
            await assertWaitForClientConfiguration(103);

            await store.maintenance.send(putDatabaseClientConfigDisabled);
            await assertWaitForClientConfiguration(102);

            await store.maintenance.server.send(new PutServerWideClientConfigurationOperation({ disabled: true }));
            await assertWaitForClientConfiguration(origin);
        } finally {
            await store.maintenance.server.send(new PutServerWideClientConfigurationOperation({ disabled: true }));
        }
    });

    it("put client configuration should not change topology etag", async () => {
        store = await testContext.getDocumentStore();

        const getTopology = async () => {
            const command = new GetDatabaseTopologyCommand();
            await store.getRequestExecutor().execute(command);
            return command.result;
        };

        const initTopology = await getTopology();

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        const fixedOrder = getAllNodesFromTopology(record.topology);
        await store.maintenance.server.send(new ReorderDatabaseMembersOperation(store.database, fixedOrder, true));

        const topologyBefore = await getTopology();
        assertThat(topologyBefore.etag).isGreaterThan(initTopology.etag);

        await store.maintenance.send(new PutClientConfigurationOperation({ readBalanceBehavior: "RoundRobin" }));
        const topologyAfter = await getTopology();

        assertThat(topologyAfter.etag).isEqualTo(topologyBefore.etag);
    });
});
