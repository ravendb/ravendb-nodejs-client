import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";

describe("With custom key case conventions set", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    // tslint:disable-next-line:no-empty
    it.skip("TODO loads PascalCased entities as camelCased", async () => {});
    // tslint:disable-next-line:no-empty
    it.skip("TODO stores camelCased entities as PascalCased", async () => {});
});
