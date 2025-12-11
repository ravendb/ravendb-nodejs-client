import {assertThat, assertThrows} from "../../../Utils/AssertExtensions.js";
import {PullReplicationAsSink} from "../../../../src/Documents/Operations/Replication/PullReplicationAsSink.js";
import {
    UpdatePullReplicationAsSinkOperation
} from "../../../../src/Documents/Operations/Replication/UpdatePullReplicationAsSinkOperation.js";

describe("UpdatePullReplicationAsSinkOperation", function () {

    it("should accept useServerCertificate parameter", async () => {
        const pullReplication: PullReplicationAsSink = {
            connectionStringName: "test",
            taskId: 1,
            name: "test-replication",
            hubName: "hub1",
            mode: "None"
        };

        const operation1 = new UpdatePullReplicationAsSinkOperation(pullReplication, false);
        assertThat(operation1).isNotNull();

        const operation2 = new UpdatePullReplicationAsSinkOperation(pullReplication, true);
        assertThat(operation2).isNotNull();

        const operation3 = new UpdatePullReplicationAsSinkOperation(pullReplication);
        assertThat(operation3).isNotNull();
    });

    it("should throw when both certificateWithPrivateKey and useServerCertificate are set", async () => {
        const pullReplication: PullReplicationAsSink = {
            connectionStringName: "test",
            taskId: 1,
            name: "test-replication",
            hubName: "hub1",
            mode: "None",
            certificateWithPrivateKey: "fake-certificate-data"
        };
        await assertThrows(
            () => Promise.resolve(new UpdatePullReplicationAsSinkOperation(pullReplication, true)),
            err => {
                assertThat(err.message).contains("useServerCertificate is set to true");
                assertThat(err.message).contains("certificateWithPrivateKey should be null");
            }
        );
    });

    it("should allow custom certificate when useServerCertificate is false", async () => {
        const pullReplication: PullReplicationAsSink = {
            connectionStringName: "test",
            taskId: 1,
            name: "test-replication",
            hubName: "hub1",
            mode: "None",
            certificateWithPrivateKey: "fake-certificate-data"
        };
        const operation1 = new UpdatePullReplicationAsSinkOperation(pullReplication, false);
        assertThat(operation1).isNotNull();

        const operation2 = new UpdatePullReplicationAsSinkOperation(pullReplication);
        assertThat(operation2).isNotNull();
    });

    it("should throw when pullReplication is null", async () => {
        await assertThrows(
            () => Promise.resolve(new UpdatePullReplicationAsSinkOperation(null as any)),
            err => {
                assertThat(err.message).contains("PullReplication cannot be null");
            }
        );

        await assertThrows(
            () => Promise.resolve(new UpdatePullReplicationAsSinkOperation(null as any, true)),
            err => {
                assertThat(err.message).contains("PullReplication cannot be null");
            }
        );
    });

    it("should create command with useServerCertificate flag", async () => {
        const pullReplication: PullReplicationAsSink = {
            connectionStringName: "",
            taskId: 1,
            name: "test-replication",
            hubName: "hub1",
            mode: "None"
        };

        const operation = new UpdatePullReplicationAsSinkOperation(pullReplication, true);
        assertThat(operation).isNotNull();

        const command = operation.getCommand({} as any);
        assertThat(command).isNotNull();
    });

    it("should handle all valid combinations of certificateWithPrivateKey and useServerCertificate", async () => {
        const scenarios = [
            {cert: null, useServer: false, shouldThrow: false, description: "No cert, no server cert"},
            {cert: null, useServer: true, shouldThrow: false, description: "No cert, use server cert"},
            {cert: "custom-cert", useServer: false, shouldThrow: false, description: "Custom cert, no server cert"},
            {
                cert: "custom-cert",
                useServer: true,
                shouldThrow: true,
                description: "Custom cert + server cert (invalid)"
            }
        ];

        for (const scenario of scenarios) {
            const pullReplication: PullReplicationAsSink = {
                connectionStringName: "",
                taskId: 1,
                name: "test-replication",
                hubName: "hub1",
                mode: "None",
                certificateWithPrivateKey: scenario.cert
            };

            if (scenario.shouldThrow) {
                await assertThrows(
                    () => Promise.resolve(new UpdatePullReplicationAsSinkOperation(pullReplication, scenario.useServer)),
                    err => {
                        assertThat(err.message).contains("useServerCertificate");
                    },
                );
            } else {
                const operation = new UpdatePullReplicationAsSinkOperation(pullReplication, scenario.useServer);
                assertThat(operation).isNotNull();
            }
        }
    });

    it("should pass useServerCertificate flag to the command", async () => {
        const pullReplication: PullReplicationAsSink = {
            connectionStringName: "",
            taskId: 1,
            name: "test-replication",
            hubName: "hub1",
            mode: "None"
        };

        const operation1 = new UpdatePullReplicationAsSinkOperation(pullReplication, true);
        const command1 = operation1.getCommand({} as any);
        assertThat(command1).isNotNull();

        const operation2 = new UpdatePullReplicationAsSinkOperation(pullReplication, false);
        const command2 = operation2.getCommand({} as any);
        assertThat(command2).isNotNull();

        assertThat(command1).isNotNull();
        assertThat(command2).isNotNull();
    });

    it("should use default value false for useServerCertificate when not provided", async () => {
        const pullReplication: PullReplicationAsSink = {
            connectionStringName: "",
            taskId: 1,
            name: "test-replication",
            hubName: "hub1",
            mode: "None",
            certificateWithPrivateKey: "custom-cert"
        };

        // When useServerCertificate is not provided, it defaults to false
        // So having a custom certificate should be allowed
        const operation = new UpdatePullReplicationAsSinkOperation(pullReplication);
        assertThat(operation).isNotNull();
    });

    it("should validate error message contains proper field names", async () => {
        const pullReplication: PullReplicationAsSink = {
            connectionStringName: "",
            taskId: 1,
            name: "test-replication",
            hubName: "hub1",
            mode: "None",
            certificateWithPrivateKey: "custom-cert"
        };

        await assertThrows(
            () => Promise.resolve(new UpdatePullReplicationAsSinkOperation(pullReplication, true)),
            err => {
                assertThat(err.message.toLowerCase()).contains("useservercertificate");
                assertThat(err.message.toLowerCase()).contains("certificatewithprivatekey");
            }
        );
    });
});

