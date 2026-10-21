import {
    AiConnectionString,
    AiTaskIdentifierHelper,
    CreateDatabaseOperation,
    DatabaseRecord,
    DeleteDatabasesOperation,
    GetConnectionStringsOperation,
    GetServerWideConnectionStringsOperation,
    IDocumentStore,
    OpenAiSettings,
    PutConnectionStringOperation,
    PutServerWideConnectionStringOperation,
    RemoveServerWideConnectionStringOperation,
    ServerWideConnectionString
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest ? describe : describe.skip)("RavenDB_24310", function () {

    let store: IDocumentStore;
    let serverWideNames: string[];
    let databasesToDelete: string[];

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        serverWideNames = [];
        databasesToDelete = [];
    });

    afterEach(async () => {
        for (const name of serverWideNames) {
            await store.maintenance.server.send(
                new RemoveServerWideConnectionStringOperation(newAiConnectionString(name, null)));
        }

        if (databasesToDelete.length) {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: databasesToDelete,
                hardDelete: true
            }));
        }

        await disposeTestDocumentStore(store);
    });

    // server-wide connection strings propagate to databases under this prefix
    const prefixed = (name: string) => `Server Wide Connection String, ${name}`;

    async function putServerWide(name: string, identifier: string, apiKey?: string) {
        const serverWide = new ServerWideConnectionString();
        serverWide.connectionString = newAiConnectionString(name, identifier, apiKey);
        await store.maintenance.server.send(new PutServerWideConnectionStringOperation(serverWide));

        if (!serverWideNames.includes(name)) {
            serverWideNames.push(name);
        }
    }

    async function getServerWide(name: string) {
        const result = await store.maintenance.server.send(new GetServerWideConnectionStringsOperation(name, "Ai"));
        return result.results;
    }

    async function getAiConnectionStrings(database: string) {
        const result = await store.maintenance.forDatabase(database).send(new GetConnectionStringsOperation());
        return result.aiConnectionStrings ?? {};
    }

    async function createDatabase(record: DatabaseRecord) {
        await store.maintenance.server.send(new CreateDatabaseOperation(record));
        databasesToDelete.push(record.databaseName);
    }

    it("serverWideAiConnectionString_GeneratesIdentifierWhenMissing", async () => {
        const csName = "My Server Wide AI CS";
        await putServerWide(csName, null);

        const expectedIdentifier = AiTaskIdentifierHelper.generateIdentifier(csName);

        const results = await getServerWide(csName);
        assertThat(results)
            .hasSize(1);
        assertThat((results[0].connectionString as AiConnectionString).identifier)
            .isEqualTo(expectedIdentifier);

        const connectionStrings = await getAiConnectionStrings(store.database);
        assertThat(connectionStrings[prefixed(csName)].identifier)
            .isEqualTo(expectedIdentifier);

        const newDbName = store.database + "_new";
        await createDatabase({ databaseName: newDbName });
        const newConnectionStrings = await getAiConnectionStrings(newDbName);
        assertThat(newConnectionStrings[prefixed(csName)].identifier)
            .isEqualTo(expectedIdentifier);
    });

    it("aiConnectionString_RejectsMissingIdentifierWhenNameHasNoAsciiLettersOrDigits", async () => {
        const csName = "日本語";
        const expectedError = `Can't generate an identifier from name '${csName}' because it contains no ASCII letters or digits`;

        await assertThrows(() => putServerWide(csName, null), err => {
            assertThat(err.message)
                .contains(expectedError);
        });

        assertThat(await getServerWide(csName))
            .hasSize(0);

        await assertThrows(() => store.maintenance.send(new PutConnectionStringOperation(newAiConnectionString(csName, null))), err => {
            assertThat(err.message)
                .contains(expectedError);
        });

        await putServerWide(csName, "nihongo");
        await store.maintenance.send(new PutConnectionStringOperation(newAiConnectionString("Database " + csName, null)));
    });

    it("serverWideAiConnectionString_RejectsInvalidIdentifier", async () => {
        await assertThrows(() => putServerWide("MyAiCS", "Invalid_Identifier"), err => {
            assertThat(err.name)
                .isEqualTo("BadRequestException");
            assertThat(err.message)
                .contains("Invalid connection string identifier");
            assertThat(err.message)
                .contains("uppercase");
        });

        assertThat(await getServerWide("MyAiCS"))
            .hasSize(0);
    });

    it("serverWideAiConnectionString_RejectsIdentifierUsedByDatabaseConnectionString", async () => {
        const identifier = "shared-identifier";
        await store.maintenance.send(new PutConnectionStringOperation(newAiConnectionString("DbLevelAiCS", identifier)));

        await assertThrows(() => putServerWide("MyAiCS", identifier), err => {
            assertThat(err.message)
                .contains(`The identifier '${identifier}' is already used by connection string 'DbLevelAiCS' in database '${store.database}'`);
        });

        const connectionStrings = await getAiConnectionStrings(store.database);
        assertThat(connectionStrings[prefixed("MyAiCS")])
            .isUndefined();

        assertThat(await getServerWide("MyAiCS"))
            .hasSize(0);

        const serverWide = new ServerWideConnectionString();
        serverWide.connectionString = newAiConnectionString("MyAiCS", identifier);
        serverWide.excludedDatabases = [store.database];
        await store.maintenance.server.send(new PutServerWideConnectionStringOperation(serverWide));
        serverWideNames.push("MyAiCS");

        serverWide.excludedDatabases = null;
        await assertThrows(() => store.maintenance.server.send(new PutServerWideConnectionStringOperation(serverWide)), err => {
            assertThat(err.message)
                .contains(`The identifier '${identifier}' is already used`);
        });
    });

    it("serverWideAiConnectionString_CanBeUpdatedWithSameIdentifier", async () => {
        const identifier = "my-identifier";
        await putServerWide("MyAiCS", identifier);
        await putServerWide("MyAiCS", identifier, "rotated-key");

        const connectionStrings = await getAiConnectionStrings(store.database);
        assertThat(connectionStrings[prefixed("MyAiCS")].identifier)
            .isEqualTo(identifier);
        assertThat(connectionStrings[prefixed("MyAiCS")].openAiSettings.apiKey)
            .isEqualTo("rotated-key");
    });

    it("serverWideAiConnectionString_RejectsNewDatabaseWithConflictingIdentifier", async () => {
        const identifier = "shared-identifier";
        await putServerWide("MyAiCS", identifier);

        const newDbName = store.database + "_new";
        const newRecord: DatabaseRecord = {
            databaseName: newDbName,
            aiConnectionStrings: { DbLevelAiCS: newAiConnectionString("DbLevelAiCS", identifier) }
        };

        await assertThrows(() => createDatabase(newRecord), err => {
            assertThat(err.message)
                .contains(`Can't create database '${newDbName}'. Its AI connection string 'DbLevelAiCS' uses identifier '${identifier}', which is also used by server-wide connection string 'MyAiCS'`);
            assertThat(err.message)
                .contains("Exclude the database from 'MyAiCS' or change one of the identifiers");
        });
    });

    it("serverWideAiConnectionString_RejectsNewDatabaseWhoseConnectionStringWithoutIdentifierWouldGetConflictingIdentifier", async () => {
        const dbLevelName = "DbLevelAiCS";
        const identifier = AiTaskIdentifierHelper.generateIdentifier(dbLevelName);
        await putServerWide("MyAiCS", identifier);

        const newDbName = store.database + "_new";
        const newRecord: DatabaseRecord = {
            databaseName: newDbName,
            aiConnectionStrings: { [dbLevelName]: newAiConnectionString(dbLevelName, null) }
        };

        await assertThrows(() => createDatabase(newRecord), err => {
            assertThat(err.message)
                .contains(`Can't create database '${newDbName}'. Its AI connection string '${dbLevelName}' uses identifier '${identifier}', which is also used by server-wide connection string 'MyAiCS'`);
        });
    });

    it("serverWideAiConnectionString_UpdateWithoutIdentifierKeepsStoredIdentifier", async () => {
        const csName = "My Server Wide AI CS";
        const generatedIdentifier = AiTaskIdentifierHelper.generateIdentifier(csName);

        await putServerWide(csName, null);

        let connectionStrings = await getAiConnectionStrings(store.database);
        assertThat(connectionStrings[prefixed(csName)].identifier)
            .isEqualTo(generatedIdentifier);

        await putServerWide(csName, null, "rotated-key");

        connectionStrings = await getAiConnectionStrings(store.database);
        assertThat(connectionStrings[prefixed(csName)].identifier)
            .isEqualTo(generatedIdentifier);
        assertThat(connectionStrings[prefixed(csName)].openAiSettings.apiKey)
            .isEqualTo("rotated-key");

        const results = await getServerWide(csName);
        assertThat((results[0].connectionString as AiConnectionString).identifier)
            .isEqualTo(generatedIdentifier);

        await putServerWide(csName, "explicit-identifier");

        connectionStrings = await getAiConnectionStrings(store.database);
        assertThat(connectionStrings[prefixed(csName)].identifier)
            .isEqualTo("explicit-identifier");
    });

    it("serverWideAiConnectionString_RejectsIdentifierUsedByAnotherServerWideConnectionString", async () => {
        const identifier = "shared-identifier";
        await putServerWide("FirstAiCS", identifier);

        await assertThrows(() => putServerWide("SecondAiCS", identifier), err => {
            assertThat(err.message)
                .contains(`The identifier '${identifier}' is already used by server-wide connection string 'FirstAiCS'`);
        });

        assertThat(await getServerWide("SecondAiCS"))
            .hasSize(0);

        await putServerWide("SecondAiCS", "other-identifier");

        const newDbName = store.database + "_new";
        await createDatabase({ databaseName: newDbName });
        const connectionStrings = await getAiConnectionStrings(newDbName);
        assertThat(connectionStrings[prefixed("FirstAiCS")])
            .isNotNull();
        assertThat(connectionStrings[prefixed("SecondAiCS")])
            .isNotNull();
    });
});

function newAiConnectionString(name: string, identifier: string, apiKey: string = "fake-key"): AiConnectionString {
    const connectionString = new AiConnectionString();
    connectionString.name = name;
    connectionString.identifier = identifier;
    connectionString.modelType = "Chat";
    connectionString.openAiSettings = new OpenAiSettings(apiKey, "https://api.openai.example", "test");
    return connectionString;
}
