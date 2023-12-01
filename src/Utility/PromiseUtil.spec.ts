import { wrapWithTimeout } from "./PromiseUtil";
import { assertThat, assertThrows } from "../../test/Utils/AssertExtensions";
import { getError } from "../Exceptions";


describe("PromiseUtil", function () {
    describe("wrapWithTimeout", function () {
        it("returns value when promise wins", async function () {
            const promise = new Promise<number>((resolve) => {
                setTimeout(() => resolve(1), 50);
            });

            const result = await wrapWithTimeout(promise, 100);

            assertThat(result)
                .isEqualTo(1);
        });

        it("throws if timeout is reached", async function () {
            const promise = new Promise<number>((resolve) => {
                setTimeout(() => resolve(1), 100);
            });

            await assertThrows(() => wrapWithTimeout(promise, 50), err => {
                assertThat(err.name)
                    .isEqualTo("TimeoutException");
            });
        });

        it("throws if promise throws", async function () {
            const promise = new Promise<number>((_, reject) => {
                setTimeout(() => reject(getError("InvalidArgumentException", "TEST")), 100);
            });

            await assertThrows(() => wrapWithTimeout(promise, 10_000), err => {
                assertThat(err.name)
                    .isEqualTo("InvalidArgumentException");
            });
        })
    })
});
