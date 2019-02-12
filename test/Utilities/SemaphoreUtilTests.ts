import * as mocha from "mocha";
import * as assert from "assert";
import { User, Company, Order } from "../Assets/Entities";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import * as SemaphoreUtil from "../../src/Utility/SemaphoreUtil";
import {
    RavenErrorType,
    IDocumentStore,
} from "../../src";
import * as semaphore from "semaphore";
import { delay } from "bluebird";

describe("SemaphoreUtil", function () {

    let sem: semaphore.Semaphore;

    beforeEach(function () {
        sem = semaphore();
    });

    it("should be able to acquire and release semaphore ", async () => {
        const semContext = SemaphoreUtil.acquireSemaphore(sem);
        await semContext.promise;
        semContext.dispose();
    });

    it("can timeout and try again", async () => {
        assert.ok(sem.available(1));

        const semContextLocked = SemaphoreUtil.acquireSemaphore(sem, { 
            contextName: "LOCK" 
        });

        await semContextLocked.promise;
        assert.ok(!sem.available(1));
        
        const semContextTimingOut = SemaphoreUtil.acquireSemaphore(sem, { 
            timeout: 100, 
            contextName: "SHOULD_TIMEOUT" 
        });

        assert.ok(!sem.available(1));

        try {
            await semContextTimingOut.promise;
        } catch (err) {
            assert.strictEqual(err.name, "TimeoutError");
            assert.ok(!sem.available(1));

            const secondSemAcqAttempt = SemaphoreUtil.acquireSemaphore(sem, { 
                timeout: 1000,
                contextName: "SHOULD_NOT_TIMEOUT"
            });

            assert.ok(!sem.available(1));
            semContextLocked.dispose();
            
            await secondSemAcqAttempt.promise;

            secondSemAcqAttempt.dispose();

            return;
        }

        assert.fail("it should have timed out.");
    });

    it("should be able to acquire and release semaphore with multiple clients", async () => {
        const semContext = SemaphoreUtil.acquireSemaphore(sem, { contextName: "1" });
        const semContext2 = SemaphoreUtil.acquireSemaphore(sem, { contextName: "2" });
        const semContext3 = SemaphoreUtil.acquireSemaphore(sem, { contextName: "3" });

        async function semTryf(semContext, delayMs) {
            try {
                await semContext.promise;
                await delay(delayMs);
            } finally {
                semContext.dispose();
            }
        }

        await Promise.all([ 
            semTryf(semContext, 10), 
            semTryf(semContext2, 15),
            semTryf(semContext3, 5),
        ]);
    });
});
