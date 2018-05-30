import * as assert from "assert";
import { 
    testContext,
    disposeTestDocumentStore 
} from "../../Utils/TestUtil";
import {
    IDocumentStore,
    ClientConfiguration,
    IRavenResponse,
    GetClientConfigurationOperation,
    PutClientConfigurationOperation 
} from "../../../src";

describe("Client configuration", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can handle no configuration", async () => {
        const operation = new GetClientConfigurationOperation();
        const result: IRavenResponse = await store.maintenance.send(operation);
        assert.ok("configuration" in result);
        assert.ok(!result.configuration);
        assert.ok(result.etag);
    });

    it("can save and read client configuration", async () => {
        const configurationToSave: ClientConfiguration = {
            etag: 123,
            maxNumberOfRequestsPerSession: 80,
            readBalanceBehavior: "FastestNode",
            disabled: true
        };

        const saveOperation = new PutClientConfigurationOperation(configurationToSave);
        await store.maintenance.send(saveOperation);

        const operation = new GetClientConfigurationOperation();
        const result = await store.maintenance.send(operation);
        const configuration = result.configuration;
        assert.ok(configuration.etag);
        assert.ok(configuration.disabled);
        assert.equal(configuration.maxNumberOfRequestsPerSession, 80);
        assert.equal(configuration.readBalanceBehavior, "FastestNode");
    });
});
