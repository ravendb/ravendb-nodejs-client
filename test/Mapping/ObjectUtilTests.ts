import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import { ObjectUtil } from '../../src/Utility/ObjectUtil';

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../src";

describe("ObjectUtil", function () {

    it("can ignore some keys when transforming", async () => {
        // tslint:disable-next-line:max-line-length
        const json = `{"Results":[{"Type":"PUT","@id":"users/1","@collection":"Users","@change-vector":"A:1-2ZYfAzcv8Ee+U/12oFmTJQ","@last-modified":"2018-08-22T06:10:29.8004542"}]}`;
        const o = JSON.parse(json);
        const opts = {
                recursive: true,
                arrayRecursive: true,
                ignoreKeys: [ /^@/ ]
            };
        const transformed = ObjectUtil.transformObjectKeys("camel", o, opts);
        assert.equal("users/1", transformed["results"][0]["@id"]);
    });

    it("can ignore child nodes for selected keys", () => {
        // tslint:disable-next-line:max-line-length
        const json = `{"Results":[{"Type":"PUT","@id":"users/1","@collection":"Users","@change-vector":"A:1-2ZYfAzcv8Ee+U/12oFmTJQ","@last-modified":"2018-08-22T06:10:29.8004542"}]}`;
        const o = JSON.parse(json);
        const opts = {
                recursive: true,
                arrayRecursive: true,
                ignorePaths: [ /results\.\[\]\.@/i ]
            };
        const transformed = ObjectUtil.transformObjectKeys("camel", o, opts);
        assert.equal("users/1", transformed["results"][0]["@id"]);
    });
});
