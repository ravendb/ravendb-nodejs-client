import { AzureServiceBusSinkSource } from "../../../../../src/index.js";
import { assertThat, assertThrows } from "../../../../Utils/AssertExtensions.js";

describe("AzureServiceBusSinkSourceTest", function () {

    it("queue returns queue name when name valid", () => {
        assertThat(AzureServiceBusSinkSource.queue("my-queue"))
            .isEqualTo("my-queue");
    });

    it("queue throws when name empty", async () => {
        for (const name of [null, "", "   "]) {
            await assertThrows(() => Promise.resolve(AzureServiceBusSinkSource.queue(name)), err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
            });
        }
    });

    it("queue throws when name contains separator", async () => {
        await assertThrows(() => Promise.resolve(AzureServiceBusSinkSource.queue("foo;bar")), err => {
            assertThat(err.name).isEqualTo("InvalidArgumentException");
        });
    });

    it("subscription encodes topic and subscription", () => {
        assertThat(AzureServiceBusSinkSource.subscription("topic", "sub"))
            .isEqualTo("topic;sub");
    });

    it("subscription throws when argument empty", async () => {
        const cases: [string, string][] = [
            [null, "sub"],
            ["", "sub"],
            ["   ", "sub"],
            ["topic", null],
            ["topic", ""],
            ["topic", "   "]
        ];

        for (const [topic, subscription] of cases) {
            await assertThrows(() => Promise.resolve(AzureServiceBusSinkSource.subscription(topic, subscription)), err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
            });
        }
    });

    it("subscription throws when argument contains separator", async () => {
        const cases: [string, string][] = [
            ["to;pic", "sub"],
            ["topic", "su;b"]
        ];

        for (const [topic, subscription] of cases) {
            await assertThrows(() => Promise.resolve(AzureServiceBusSinkSource.subscription(topic, subscription)), err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
            });
        }
    });
});
