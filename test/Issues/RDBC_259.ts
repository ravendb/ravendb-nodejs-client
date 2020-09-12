import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("RDBC-259", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async store => {
            store.conventions.findCollectionNameForObjectLiteral = 
                e => e ? e["type"] + "s" : "@empty";
        };

        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    describe("if you take part (a subobject) of the object A and put into B", function () {

        it("it's gonna update both of them and won't mix up IDs when updating using batch op response", async () => {

            let configId;
            let extensionId;

            {
                const session = store.openSession();
                const config: any = {
                    type: "config",
                    properties: {
                        A: 1,
                        B: 2
                    }
                };

                await session.store(config);
                await session.saveChanges();

                assert.strictEqual(config.id, "configs/1-A");
                configId = config.id;
            }

            {
                const session = store.openSession();
                const config: any = await session.load(configId);

                const customConfig = config.properties;
                customConfig["A"] = 2;

                const extension: any = {
                    type: "extension",
                    config: customConfig
                };

                assert.ok(session.advanced.hasChanged(config));

                await session.store(extension);
                
                assert.ok(session.advanced.hasChanged(extension));

                const changes = session.advanced.whatChanged();

                await session.saveChanges();

                assert.strictEqual(extension.id, "extensions/1-A");
                assert.strictEqual(config.id, "configs/1-A");
                extensionId = extension.id;
            }

            {
                const session = store.openSession();
                const config: any = await session.load(configId);
                const extension: any = await session.load(extensionId);

                assert.strictEqual(config.id, "configs/1-A");
                assert.strictEqual(config.type, "config");
                assert.strictEqual(config.properties["A"], 2);
                assert.strictEqual(config.properties["B"], 2);

                assert.strictEqual(extension.id, "extensions/1-A");
                assert.strictEqual(extension.type, "extension");
                assert.strictEqual(extension.config["A"], 2);
                assert.strictEqual(extension.config["B"], 2);
            }
        });

    });

});
