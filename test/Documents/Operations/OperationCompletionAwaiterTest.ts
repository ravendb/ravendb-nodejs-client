import { EventEmitter } from "node:events";
import {
    DocumentConventions,
    IDatabaseChanges,
    IOperationProgress,
    OperationCompletionAwaiter,
    OperationState,
    OperationStatusFetchMode,
    RequestExecutor
} from "../../../src/index.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class FakeOperationChanges {
    private _onSubscribed: () => void;
    public readonly subscribedNow = new Promise<void>(resolve => this._onSubscribed = resolve);
    public readonly observable = Object.assign(new EventEmitter(), {
        ensureSubscribedNow: async () => {
            this.subscribed = true;
            this._onSubscribed();
        }
    });
    public readonly connection = new EventEmitter();
    public subscribed = false;

    public constructor(private readonly _connect: () => Promise<unknown> = async () => undefined) {
    }

    public readonly changes = {
        connected: true,
        ensureConnectedNow: () => this._connect(),
        forOperationId: () => this.observable,
        on: (type: string, handler: () => void) => this.connection.on(type, handler),
        off: (type: string, handler: () => void) => this.connection.off(type, handler)
    } as unknown as IDatabaseChanges;

    public notify(state: OperationState) {
        this.observable.emit("data", { operationId: 1, state });
    }

    public listenerCount() {
        return this.observable.listenerCount("data") + this.observable.listenerCount("error")
            + this.connection.listenerCount("connectionStatus");
    }
}

function fakeRequestExecutor(states: (OperationState | null)[]) {
    return {
        execute: async (command: { result: unknown }) => {
            command.result = states.length > 1 ? states.shift() : states[0];
        },
        getUrl: () => "http://127.0.0.1:8080"
    } as unknown as RequestExecutor;
}

function conventions(mode: OperationStatusFetchMode) {
    const result = new DocumentConventions();
    result.operationStatusFetchMode = mode;
    return result;
}

const inProgress = (processed: number): OperationState => ({
    status: "InProgress",
    progress: { processed, total: 10 } as IOperationProgress,
    result: null
});

const completed: OperationState = {
    status: "Completed",
    progress: null,
    result: { message: "done" }
};

describe("OperationCompletionAwaiter", function () {

    describe("polling", function () {

        it("emits progress and returns the result", async () => {
            const executor = fakeRequestExecutor([inProgress(3), completed]);
            const awaiter = new OperationCompletionAwaiter(executor, conventions("Polling"), 1);
            const progress: IOperationProgress[] = [];
            awaiter.on("progress", p => progress.push(p));

            const result = await awaiter.waitForCompletion();

            assertThat(result.message).isEqualTo("done");
            assertThat(progress).hasSize(1);
            assertThat(progress[0]["processed"]).isEqualTo(3);
        });

        it("polls when changes are set but the convention is Polling", async () => {
            const fake = new FakeOperationChanges();
            const awaiter = new OperationCompletionAwaiter(
                fakeRequestExecutor([completed]), conventions("Polling"), 1, "A", () => fake.changes);

            await awaiter.waitForCompletion();

            assertThat(fake.subscribed).isFalse();
        });

        it("polls in ChangesApi mode when no changes are available", async () => {
            const awaiter = new OperationCompletionAwaiter(fakeRequestExecutor([completed]), conventions("ChangesApi"), 1);

            const result = await awaiter.waitForCompletion();

            assertThat(result.message).isEqualTo("done");
        });
    });

    it("retries while the server has not registered the operation yet", async () => {
        const awaiter = new OperationCompletionAwaiter(fakeRequestExecutor([null, completed]), conventions("Polling"), 1);

        const result = await awaiter.waitForCompletion();

        assertThat(result.message).isEqualTo("done");
    });

    it("throws when the operation state cannot be fetched", async () => {
        const awaiter = new OperationCompletionAwaiter(fakeRequestExecutor([null]), conventions("Polling"), 1, "A");

        await assertThrows(
            () => awaiter.waitForCompletion(),
            err => assertThat(err.message).contains("Could not fetch state of operation '1' from node 'A'"));
    });

    describe("changes api", function () {

        function changesAwaiter(states: (OperationState | null)[], fake: FakeOperationChanges) {
            return new OperationCompletionAwaiter(
                fakeRequestExecutor(states), conventions("ChangesApi"), 1, "A", () => fake.changes);
        }

        it("completes from notifications and emits their progress", async () => {
            const fake = new FakeOperationChanges();
            const awaiter = changesAwaiter([inProgress(0)], fake);
            const progress: number[] = [];
            awaiter.on("progress", p => progress.push(p["processed"]));

            const waiting = awaiter.waitForCompletion();
            await fake.subscribedNow;

            fake.notify(inProgress(5));
            fake.notify(inProgress(9));
            fake.notify(completed);

            const result = await waiting;

            assertThat(result.message).isEqualTo("done");
            assertThat(progress.includes(5) && progress.includes(9)).isTrue();
            assertThat(fake.listenerCount()).isEqualTo(0);
        });

        it("completes from the fetched state when the operation finished before subscribing", async () => {
            const fake = new FakeOperationChanges();

            const result = await changesAwaiter([completed], fake).waitForCompletion();

            assertThat(fake.subscribed).isTrue();
            assertThat(result.message).isEqualTo("done");
            assertThat(fake.listenerCount()).isEqualTo(0);
        });

        it("throws when the operation is canceled", async () => {
            const fake = new FakeOperationChanges();
            const waiting = changesAwaiter([inProgress(0)], fake).waitForCompletion();
            await fake.subscribedNow;

            fake.notify({ status: "Canceled", progress: null, result: null });

            await assertThrows(() => waiting, err => assertThat(err.name).isEqualTo("OperationCanceledException"));
            assertThat(fake.listenerCount()).isEqualTo(0);
        });

        it("throws the server error when the operation is faulted", async () => {
            const fake = new FakeOperationChanges();
            const waiting = changesAwaiter([inProgress(0)], fake).waitForCompletion();
            await fake.subscribedNow;

            fake.notify({
                status: "Faulted",
                progress: null,
                result: { message: "boom", type: "Raven.Client.Exceptions.Documents.DocumentDoesNotExistException", error: "boom", statusCode: 500 } as never
            });

            await assertThrows(() => waiting, err => assertThat(err.name).isEqualTo("DocumentDoesNotExistException"));
        });

        it("throws when the changes subscription fails", async () => {
            const fake = new FakeOperationChanges();
            const waiting = changesAwaiter([inProgress(0)], fake).waitForCompletion();
            await fake.subscribedNow;

            fake.observable.emit("error", new Error("connection lost"));

            await assertThrows(() => waiting, err => assertThat(err.message).isEqualTo("connection lost"));
            assertThat(fake.listenerCount()).isEqualTo(0);
        });

        it("fetches the state again after reconnecting", async () => {
            const fake = new FakeOperationChanges();
            let fetches = 0;
            let onFirstFetch: () => void;
            const firstFetch = new Promise<void>(resolve => onFirstFetch = resolve);
            const executor = {
                execute: async (command: { result: unknown }) => {
                    command.result = ++fetches === 1 ? inProgress(0) : completed;
                    onFirstFetch();
                },
                getUrl: () => "http://127.0.0.1:8080"
            } as unknown as RequestExecutor;

            const waiting = new OperationCompletionAwaiter(executor, conventions("ChangesApi"), 1, "A", () => fake.changes)
                .waitForCompletion();
            await firstFetch;

            fake.connection.emit("connectionStatus");

            const result = await waiting;
            assertThat(result.message).isEqualTo("done");
        });

        it("throws TimeoutException when the changes connection never opens", async () => {
            const fake = new FakeOperationChanges(() => new Promise(() => undefined));

            await assertThrows(
                () => changesAwaiter([inProgress(0)], fake).waitForCompletion(0),
                err => assertThat(err.name).isEqualTo("TimeoutException"));
            assertThat(fake.subscribed).isFalse();
        });

        it("throws TimeoutException and unsubscribes when the timeout passes", async () => {
            const fake = new FakeOperationChanges();

            await assertThrows(
                () => changesAwaiter([inProgress(0)], fake).waitForCompletion(0),
                err => assertThat(err.name).isEqualTo("TimeoutException"));
            assertThat(fake.listenerCount()).isEqualTo(0);
        });
    });
});
