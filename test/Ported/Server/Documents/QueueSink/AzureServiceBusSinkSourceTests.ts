import {
    AzureServiceBusConnectionSettings,
    AzureServiceBusEntraId,
    AzureServiceBusSinkSource
} from "../../../../../src/index.js";
import { assertThat, assertThrows } from "../../../../Utils/AssertExtensions.js";

describe("AzureServiceBusSinkSource", function () {

    it("queue_returnsQueueName_whenNameValid", () => {
        assertThat(AzureServiceBusSinkSource.queue("my-queue"))
            .isEqualTo("my-queue");
    });

    it("queue_returnsNameVerbatim_whenNameHasSpaces", () => {
        // Valid inputs round-trip verbatim: spaces are never trimmed
        assertThat(AzureServiceBusSinkSource.queue(" my-queue "))
            .isEqualTo(" my-queue ");
    });

    it("queue_throws_whenNameEmpty", async () => {
        for (const name of [null, "", "   "]) {
            await assertThrows(() => AzureServiceBusSinkSource.queue(name), err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
                assertThat(err.message).isEqualTo("Queue name must be non-empty.");
            });
        }
    });

    it("queue_throws_whenNameContainsSeparator", async () => {
        await assertThrows(() => AzureServiceBusSinkSource.queue("foo;bar"), err => {
            assertThat(err.name).isEqualTo("InvalidArgumentException");
            assertThat(err.message).isEqualTo("Queue name must not contain the ';' character.");
        });
    });

    it("subscription_encodesTopicAndSubscription", () => {
        assertThat(AzureServiceBusSinkSource.subscription("topic", "sub"))
            .isEqualTo("topic;sub");
    });

    it("subscription_returnsPartsVerbatim_whenValid", () => {
        // Valid inputs round-trip verbatim: spaces are never trimmed
        assertThat(AzureServiceBusSinkSource.subscription(" topic ", " sub "))
            .isEqualTo(" topic ; sub ");
    });

    it("subscription_throws_whenArgumentEmpty", async () => {
        const cases: [string, string][] = [
            [null, "sub"],
            ["", "sub"],
            ["   ", "sub"],
            ["topic", null],
            ["topic", ""],
            ["topic", "   "]
        ];
        for (const [topic, subscription] of cases) {
            await assertThrows(() => AzureServiceBusSinkSource.subscription(topic, subscription), err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
            });
        }
    });

    it("subscription_throws_whenArgumentContainsSeparator", async () => {
        await assertThrows(() => AzureServiceBusSinkSource.subscription("to;pic", "sub"), err => {
            assertThat(err.name).isEqualTo("InvalidArgumentException");
            assertThat(err.message).isEqualTo("Topic name must not contain the ';' character.");
        });

        await assertThrows(() => AzureServiceBusSinkSource.subscription("topic", "su;b"), err => {
            assertThat(err.name).isEqualTo("InvalidArgumentException");
            assertThat(err.message).isEqualTo("Subscription name must not contain the ';' character.");
        });
    });

    it("subscription_throwsInReferenceOrder", async () => {
        // Empty checks run before separator checks; the topic is checked before the subscription.
        await assertThrows(() => AzureServiceBusSinkSource.subscription("to;pic", ""), err => {
            assertThat(err.message).isEqualTo("Subscription name must be non-empty.");
        });

        await assertThrows(() => AzureServiceBusSinkSource.subscription("", "su;b"), err => {
            assertThat(err.message).isEqualTo("Topic name must be non-empty.");
        });

        await assertThrows(() => AzureServiceBusSinkSource.subscription("to;pic", "su;b"), err => {
            assertThat(err.message).isEqualTo("Topic name must not contain the ';' character.");
        });
    });
});

describe("AzureServiceBusConnectionSettings", function () {

    it("isValidConnection_validConnectionStrings", () => {
        const validConnectionStrings = [
            "Endpoint=sb://ns.servicebus.windows.net/;SharedAccessKeyName=key;SharedAccessKey=abc",
            "endpoint=sb://ns.servicebus.windows.net/;SharedAccessKeyName=key;SharedAccessKey=abc",
            "SharedAccessKeyName=key;Endpoint=sb://ns.servicebus.windows.net/;SharedAccessKey=abc",
            "Endpoint=sb://ns.servicebus.windows.net"
        ];
        for (const connectionString of validConnectionStrings) {
            const settings = new AzureServiceBusConnectionSettings();
            settings.connectionString = connectionString;
            assertThat(settings.isValidConnection()).isTrue();
        }
    });

    it("isValidConnection_invalidConnectionStrings", () => {
        const invalidConnectionStrings = [
            "SharedAccessKeyName=key;SharedAccessKey=abc", // no sb://
            "Endpoint=https://ns.servicebus.windows.net/;SharedAccessKey=abc", // wrong scheme
            "nothing-useful-here"
        ];
        for (const connectionString of invalidConnectionStrings) {
            const settings = new AzureServiceBusConnectionSettings();
            settings.connectionString = connectionString;
            assertThat(settings.isValidConnection()).isFalse();
        }
    });

    it("isValidConnection_entraId", () => {
        const complete = new AzureServiceBusConnectionSettings();
        complete.entraId = { namespace: "ns.servicebus.windows.net", tenantId: "t", clientId: "c", clientSecret: "s" };
        assertThat(complete.isValidConnection()).isTrue();

        const incomplete = new AzureServiceBusConnectionSettings();
        incomplete.entraId = { namespace: "ns.servicebus.windows.net", tenantId: "t", clientId: "c", clientSecret: "" };
        assertThat(incomplete.isValidConnection()).isFalse();
    });

    it("isValidConnection_passwordless", () => {
        const withNamespace = new AzureServiceBusConnectionSettings();
        withNamespace.passwordless = { namespace: "ns.servicebus.windows.net" };
        assertThat(withNamespace.isValidConnection()).isTrue();

        const withoutNamespace = new AzureServiceBusConnectionSettings();
        withoutNamespace.passwordless = { namespace: " " };
        assertThat(withoutNamespace.isValidConnection()).isFalse();
    });

    it("isValidConnection_exactlyOneAuthMethod", () => {
        // The count is presence-based: a non-null EntraId object counts even when empty.
        const twoMethods = new AzureServiceBusConnectionSettings();
        twoMethods.connectionString = "Endpoint=sb://ns.servicebus.windows.net/;SharedAccessKeyName=key;SharedAccessKey=abc";
        twoMethods.entraId = {} as AzureServiceBusEntraId;
        assertThat(twoMethods.isValidConnection()).isFalse();

        // An empty connection string is not a configured method, so the EntraId decides.
        const emptyStringWithEntraId = new AzureServiceBusConnectionSettings();
        emptyStringWithEntraId.connectionString = "";
        emptyStringWithEntraId.entraId = { namespace: "ns", tenantId: "t", clientId: "c", clientSecret: "s" };
        assertThat(emptyStringWithEntraId.isValidConnection()).isTrue();

        // A whitespace-only connection string with no other method is invalid.
        const whitespaceOnly = new AzureServiceBusConnectionSettings();
        whitespaceOnly.connectionString = "   ";
        assertThat(whitespaceOnly.isValidConnection()).isFalse();

        // Nothing configured at all is invalid.
        assertThat(new AzureServiceBusConnectionSettings().isValidConnection()).isFalse();
    });
});
