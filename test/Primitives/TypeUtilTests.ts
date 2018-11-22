import * as mocha from "mocha";
import * as assert from "assert";
import { User, Company, Order } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RavenErrorType,
    IDocumentStore,
} from "../../src";
import { TypeUtil } from "../../src/Utility/TypeUtil";

describe("TypeUtil", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("isClass()", async () => {
        assert.ok(TypeUtil.isClass(class Test {}));

        // tslint:disable-next-line:no-empty
        assert.ok(!TypeUtil.isClass(function () {}));
        
        // tslint:disable-next-line:no-empty
        assert.ok(!TypeUtil.isClass(() => {}));
        assert.ok(!TypeUtil.isClass(1));
        assert.ok(!TypeUtil.isClass("test"));

        assert.ok(!TypeUtil.isClass(Symbol("test")));
    });
});
