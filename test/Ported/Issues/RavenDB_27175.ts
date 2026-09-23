import assert from "node:assert";
import {
    IDocumentStore,
    SubscriptionWorker,
    SubscriptionWorkerState,
    SubscriptionWorkerStatus
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Company } from "../../Assets/Orders.js";
import { throwError } from "../../../src/Exceptions/index.js";

describe("RavenDB_27175Test", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canBeNotifiedOnReconnectionOfAnIdleSubscription", async () => {
        const name = await store.subscriptions.create(Company);

        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: name,
            documentType: Company,
            timeToWaitBeforeConnectionRetry: 16
        });

        try {
            let connections = 0;
            let onFirstConnection: () => void;
            let onReconnection: () => void;
            const firstConnection = new Promise<void>(resolve => onFirstConnection = resolve);
            const reconnection = new Promise<void>(resolve => onReconnection = resolve);
            const retry = new Promise<void>(resolve => worker.on("connectionRetry", () => resolve()));

            worker.on("onEstablishedSubscriptionConnection", () => {
                connections++;
                if (connections === 1) {
                    onFirstConnection();
                } else {
                    onReconnection();
                }
            });

            worker.on("batch", (batch, callback) => callback());

            await firstConnection;

            await dropConnectionAllowingReconnect(name);

            await retry;
            await reconnection;
        } finally {
            worker.dispose();
        }
    });

    it("statusFollowsTheWorkerFromConnectingThroughProcessing", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "RavenDB" }));
            await session.saveChanges();
        }

        const name = await store.subscriptions.create(Company);

        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: name,
            documentType: Company
        });

        try {
            assertThat(worker.status.state).isEqualTo("NotStarted");
            assertThat(worker.status.error).isNull();

            const observed: SubscriptionWorkerState[] = [];
            const raisedBy: SubscriptionWorker<any>[] = [];

            worker.on("stateChanged", (status, sender) => {
                observed.push(status.state);
                raisedBy.push(sender);
            });

            const stateWhileProcessing = await new Promise<SubscriptionWorkerState>(resolve => {
                worker.on("batch", (batch, callback) => {
                    resolve(worker.status.state);
                    callback();
                });
            });

            assertThat(stateWhileProcessing).isEqualTo("Processing");

            assertThat(await testContext.waitForValue(async () => worker.status.state, "WaitingForDocuments"))
                .isEqualTo("WaitingForDocuments");

            assert.deepStrictEqual(observed.slice(0, 3), ["Connecting", "WaitingForDocuments", "Processing"]);

            assertThat(raisedBy).isNotEmpty();
            assertThat(raisedBy).allMatch(sender => sender === worker);
        } finally {
            worker.dispose();
        }
    });

    it("statusReportsRetryingWithTheFailureThatCausedIt", async () => {
        const name = await store.subscriptions.create(Company);

        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: name,
            documentType: Company,
            timeToWaitBeforeConnectionRetry: 1000
        });

        try {
            const nextStatus = statusChanges(worker);

            worker.on("batch", (batch, callback) => callback());

            await nextStatus("WaitingForDocuments");
            assertThat(worker.status.state).isEqualTo("WaitingForDocuments");
            assertThat(worker.status.error).isNull();

            await dropConnectionAllowingReconnect(name);

            const status = await nextStatus("Retrying");

            assertThat(status.error.name).isEqualTo("SubscriptionClosedException");
            assertThat(status.error.message).contains(`The subscription ${name} query has been modified`);

            await nextStatus("WaitingForDocuments");

            assertThat(worker.status.error).isNull();
        } finally {
            worker.dispose();
        }
    });

    it("statusIsFaultedWithTheFailureWhenTheWorkerGivesUp", async () => {
        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: "no-such-subscription",
            documentType: Company
        });

        try {
            const error = await new Promise<Error>(resolve => {
                worker.on("error", resolve);
                worker.on("batch", (batch, callback) => callback());
            });

            assertThat(error.name).isEqualTo("SubscriptionDoesNotExistException");
            assertThat(worker.status.state).isEqualTo("Faulted");
            assertThat(worker.status.error).isSameAs(error);
        } finally {
            worker.dispose();
        }
    });

    it("statusIsStoppedAfterDispose", async () => {
        const name = await store.subscriptions.create(Company);

        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: name,
            documentType: Company
        });

        const connected = new Promise<void>(resolve => worker.on("onEstablishedSubscriptionConnection", () => resolve()));
        const ended = new Promise<void>(resolve => worker.on("end", () => resolve()));

        worker.on("batch", (batch, callback) => callback());

        await connected;

        worker.dispose();
        await ended;

        assertThat(worker.status.state).isEqualTo("Stopped");
        assertThat(worker.status.error).isNull();
    });

    it("statusIsStoppedAfterDisposingAWorkerThatWasNeverRun", async () => {
        const name = await store.subscriptions.create(Company);

        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: name,
            documentType: Company
        });

        assertThat(worker.status.state).isEqualTo("NotStarted");

        worker.dispose();

        assertThat(worker.status.state).isEqualTo("Stopped");
    });

    it("statusIsStoppedWhenDisposedWhileProcessingABatch", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "RavenDB" }));
            await session.saveChanges();
        }

        const name = await store.subscriptions.create(Company);

        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: name,
            documentType: Company
        });

        const ended = new Promise<void>(resolve => worker.on("end", () => resolve()));

        worker.on("batch", (batch, callback) => {
            worker.dispose();
            callback();
        });

        await ended;

        assertThat(worker.status.state).isEqualTo("Stopped");
        assertThat(worker.status.error).isNull();
    });

    it("failingSinceUtcSurvivesTheRetryCycleAndIsClearedOnRecovery", async () => {
        const name = await store.subscriptions.create(Company);

        const worker = store.subscriptions.getSubscriptionWorker<Company>({
            subscriptionName: name,
            documentType: Company,
            timeToWaitBeforeConnectionRetry: 100
        });

        try {
            const nextStatus = statusChanges(worker);

            worker.on("batch", (batch, callback) => callback());

            assertThat((await nextStatus("WaitingForDocuments")).failingSinceUtc).isNull();

            const workerInternals = worker as any;
            workerInternals._processSubscription = () => throwError("InvalidOperationException", "SimulateUnexpectedException");

            await dropConnectionAllowingReconnect(name);

            const first = await nextStatus("Retrying");
            assertThat(first.failingSinceUtc).isNotNull();

            const later = await nextStatus("Retrying");
            assertThat(later.sinceUtc.getTime()).isGreaterThan(first.sinceUtc.getTime());
            assertThat(later.failingSinceUtc.getTime()).isEqualTo(first.failingSinceUtc.getTime());

            delete workerInternals._processSubscription;

            assertThat((await nextStatus("Connecting")).failingSinceUtc.getTime()).isEqualTo(first.failingSinceUtc.getTime());

            assertThat((await nextStatus("WaitingForDocuments")).failingSinceUtc).isNull();
            assertThat(worker.status.failingSinceUtc).isNull();
        } finally {
            worker.dispose();
        }
    });

    async function dropConnectionAllowingReconnect(subscriptionName: string) {
        await store.subscriptions.update({ name: subscriptionName, query: "from Companies" });
    }
});

function statusChanges(worker: SubscriptionWorker<any>) {
    const pending: SubscriptionWorkerStatus[] = [];
    let wakeUp = () => {};

    worker.on("stateChanged", status => {
        pending.push(status);
        wakeUp();
    });

    return async function nextStatus(state: SubscriptionWorkerState): Promise<SubscriptionWorkerStatus> {
        for (;;) {
            if (!pending.length) {
                await new Promise<void>(resolve => wakeUp = resolve);
                continue;
            }

            const status = pending.shift();
            if (status.state === state) {
                return status;
            }
        }
    };
}
