import assert from "node:assert"
import { randomBytes, randomUUID } from "node:crypto";
import { testContext, disposeTestDocumentStore, RavenTestContext } from "../Utils/TestUtil.js";

import {
    IDocumentStore,
    PutSecretKeyCommand
} from "../../src/index.js";

describe("PutSecretKeyCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const newKey = () => randomBytes(32).toString("base64");
    const newName = () => "secret-" + randomUUID();
    const putKey = (name: string, key: string, overwrite?: boolean) =>
        store.getRequestExecutor().execute(new PutSecretKeyCommand(name, key, overwrite));

    it("rejects a key that is not 256 bits", async () => {
        await assert.rejects(
            putKey(newName(), randomBytes(16).toString("base64")),
            /must be 256 bits, but was 128 bits/);
    });

    (RavenTestContext.isPullRequest ? it.skip : it)("stores a key and guards it against overwrite", async () => {
        const name = newName();
        const key = newKey();

        await putKey(name, key);
        await putKey(name, key);

        await assert.rejects(putKey(name, newKey()), /Attempt to overwrite secret key/);

        await putKey(name, newKey(), true);
    });

    (RavenTestContext.isPullRequest ? it.skip : it)("rejects a key for an existing database that is not encrypted", async () => {
        await assert.rejects(
            putKey(store.database, newKey()),
            /existing database that is not encrypted/);
    });
});
