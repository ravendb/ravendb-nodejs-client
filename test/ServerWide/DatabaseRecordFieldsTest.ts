import assert from "node:assert";
import {
    AiConnectionString,
    ConfigureRemoteAttachmentsOperation,
    ConfigureSchemaValidationOperation,
    CreateDatabaseOperation,
    DatabaseRecordBuilder,
    DeleteDatabasesOperation,
    EmbeddedSettings,
    EmbeddingsGenerationConfiguration,
    GetDatabaseRecordOperation,
    IDocumentStore,
    RemoteAttachmentsConfiguration,
    RemoteAttachmentsDestinationConfiguration,
    RemoteAttachmentsS3Settings,
    SnowflakeConnectionString,
    SnowflakeEtlConfiguration
} from "../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../Utils/TestUtil.js";

describe("DatabaseRecordFieldsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("reads truncatedClusterTransactionCommandsCount", async () => {
        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));

        assert.strictEqual(record.truncatedClusterTransactionCommandsCount, 0);
    });

    ((RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest) ? it : it.skip)("reads schemaValidation and remoteAttachments keeping their key casing", async () => {
        await store.maintenance.send(new ConfigureSchemaValidationOperation({
            validatorsPerCollection: {
                Users: {
                    schema: JSON.stringify({ properties: { Age: { type: "number" } } })
                }
            }
        }));

        const remoteAttachments = new RemoteAttachmentsConfiguration();
        const destination = new RemoteAttachmentsDestinationConfiguration();
        destination.s3Settings = Object.assign(new RemoteAttachmentsS3Settings(), {
            bucketName: "test-bucket",
            awsAccessKey: "test-access-key",
            awsSecretKey: "test-secret-key",
            awsRegionName: "us-east-1"
        });
        remoteAttachments.destinations["S3-Users"] = destination;
        await store.maintenance.send(new ConfigureRemoteAttachmentsOperation(remoteAttachments));

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));

        assert.deepStrictEqual(Object.keys(record.schemaValidation.validatorsPerCollection), ["Users"]);
        assert.ok(record.schemaValidation.validatorsPerCollection.Users.schema.includes("Age"));

        assert.deepStrictEqual(Object.keys(record.remoteAttachments.destinations), ["S3-Users"]);
        assert.strictEqual(record.remoteAttachments.destinations["S3-Users"].s3Settings.bucketName, "test-bucket");
    });

    ((RavenTestContext.isRavenDbServerVersion("7.1") && !RavenTestContext.isPullRequest) ? it : it.skip)("creates a database with snowflake and ai connection strings via the builder", async () => {
        const database = store.database + "_builder";

        await store.maintenance.server.send(new CreateDatabaseOperation(builder => builder
            .regular(database)
            .withConnectionStrings(b => b
                .addSnowflakeConnectionString(Object.assign(new SnowflakeConnectionString(), {
                    name: "Snowflake",
                    connectionString: "account=test;user=test;password=test;db=test;schema=PUBLIC;warehouse=test"
                }))
                .addAiConnectionString(Object.assign(new AiConnectionString(), {
                    name: "Embedded",
                    identifier: "embedded",
                    modelType: "TextEmbeddings",
                    embeddedSettings: new EmbeddedSettings()
                })))));

        try {
            const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(database));

            assert.deepStrictEqual(Object.keys(record.snowflakeConnectionStrings), ["Snowflake"]);
            assert.ok(record.snowflakeConnectionStrings.Snowflake.connectionString.startsWith("account=test"));
            assert.deepStrictEqual(Object.keys(record.aiConnectionStrings), ["Embedded"]);
            assert.strictEqual(record.aiConnectionStrings.Embedded.modelType, "TextEmbeddings");
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({ databaseNames: [database], hardDelete: true }));
        }
    });

    it("adds snowflake etl and embeddings generation tasks to the record via the builder", () => {
        const snowflakeEtl = Object.assign(new SnowflakeEtlConfiguration(), { name: "snowflake-etl" });
        const embeddings = Object.assign(new EmbeddingsGenerationConfiguration(), { name: "products-embeddings" });

        const record = DatabaseRecordBuilder.create()
            .regular("db")
            .withEtls(b => b
                .addSnowflakeEtl(snowflakeEtl)
                .addEmbeddingsGeneration(embeddings))
            .toDatabaseRecord();

        assert.deepStrictEqual(record.snowflakeEtls, [snowflakeEtl]);
        assert.deepStrictEqual(record.embeddingsGenerations, [embeddings]);
    });
});
