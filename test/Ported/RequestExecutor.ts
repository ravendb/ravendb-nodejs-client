import { DocumentStore, EntityToJson, IDocumentStore, PutDocumentCommand } from "../../src";
import { ClusterTestContext, disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { throwError } from "../../src/Exceptions";
import { HttpRequestParameters, HttpResponse } from "../../src/Primitives/Http";
import * as stream from "readable-stream";
import * as http from "http";
import { User } from "../Assets/Entities";
import { assertThat } from "../Utils/AssertExtensions";

describe("RequestExecutor", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("onBeforeAfterAndFailRequest1", async () => {
        await onBeforeAfterAndFailRequestInternal(0, 1, ["OnBeforeRequest", "OnAfterRequests"]);
    });

    it("onBeforeAfterAndFailRequest2", async () => {
        await onBeforeAfterAndFailRequestInternal(1, 2, ["OnBeforeRequest", "OnFailedRequest", "OnBeforeRequest", "OnAfterRequests"]);
    });

    it("onBeforeAfterAndFailRequest3", async () => {
        await onBeforeAfterAndFailRequestInternal(2, 2, ["OnBeforeRequest", "OnFailedRequest", "OnBeforeRequest"]);
    });
});

async function onBeforeAfterAndFailRequestInternal(failCount: number, clusterSize: number, expected: string[]) {
    const actual: string[] = [];
    const sessionActual: string[] = [];

    const urlRegex = /databases\/[^/]+\/docs/;

    const context = new ClusterTestContext();
    try {
        const cluster = await context.createRaftCluster(clusterSize);
        try {
            const databaseName = context.getDatabaseName();
            const leader = cluster.getInitialLeader();

            await cluster.createDatabase(databaseName, clusterSize, leader.url);

            const store = new DocumentStore(leader.url, databaseName);
            try {
                store.addSessionListener("beforeRequest", e => {
                    if (!e.url.match(urlRegex)) {
                        return;
                    }
                    sessionActual.push("OnBeforeRequest");
                });

                store.addSessionListener("succeedRequest", e => {
                    if (!e.url.match(urlRegex)) {
                        return;
                    }
                    sessionActual.push("OnAfterRequests");
                });

                store.addSessionListener("failedRequest", e => {
                    if (!e.url.match(urlRegex)) {
                        return;
                    }
                    sessionActual.push("OnFailedRequest");
                });

                store.initialize();

                const requestExecutor = store.getRequestExecutor();

                requestExecutor.on("beforeRequest", e => {
                    if (!e.url.match(urlRegex)) {
                        return;
                    }
                    actual.push("OnBeforeRequest");
                });

                requestExecutor.on("succeedRequest", e => {
                    if (!e.url.match(urlRegex)) {
                        return;
                    }
                    actual.push("OnAfterRequests");
                });

                requestExecutor.on("failedRequest", e => {
                    if (!e.url.match(urlRegex)) {
                        return;
                    }
                    actual.push("OnFailedRequest");
                });

                const documentJson = EntityToJson.convertEntityToJson(new User(), store.conventions);
                const command = new FirstFailCommand("User/1", null, documentJson, failCount);
                try {
                    await requestExecutor.execute(command);
                } catch (e) {
                    // ignored
                }

                assertThat(actual)
                    .isNotEqualTo(expected);
                assertThat(sessionActual)
                    .isNotEqualTo(expected);
            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    } finally {
        context.dispose();
    }
}

class FirstFailCommand extends PutDocumentCommand {
    private _timeToFail: number;

    public constructor(id: string, changeVector: string, document: object, timeToFail: number) {
        super(id, changeVector, document);

        this._timeToFail = timeToFail;
    }

    send(agent: http.Agent, requestOptions: HttpRequestParameters): Promise<{ response: HttpResponse; bodyStream: stream.Readable }> {
        this._timeToFail--;
        if (this._timeToFail < 0) {
            return super.send(agent, requestOptions);
        }

        throwError("BadRequestException", "Just testing");
    }
}