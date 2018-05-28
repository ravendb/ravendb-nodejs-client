import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    AbstractIndexCreationTask,
} from "../../../src";

describe("SpatialSearchTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it.skip("can do spatial search with client api", async () => {

    });

    it.skip("can do spatial search with client api 3", async () => {});

    it.skip("can do spatial search with client api within given capacity", async () => {});

    it.skip("can do spatial search with client api add order", async () => {});
});


export class SpatialIdx extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = `docs.Events.Select(e => new {
                capacity = e.capacity,
                venue = e.venue,
                date = e.date,
                coordinates = this.CreateSpatialField(((double ? ) e.latitude), ((double ? ) e.longitude))
            })`;

        this.index("venue", "Search");
    }
}