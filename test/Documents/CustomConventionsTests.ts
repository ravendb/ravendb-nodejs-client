import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("With custom conventions set", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    // tslint:disable-next-line:no-empty
    it.skip("TODO handles PascalCased entities", async () => {});
});
