import {disposeTestDocumentStore, RavenTestContext, testContext} from "../Utils/TestUtil.js";
import {
    ConfigureSchemaValidationOperation,
    GetSchemaValidationConfiguration,
    IDocumentStore,
    SchemaValidationConfiguration
} from "../../src/index.js";
import {assertThat} from "../Utils/AssertExtensions.js";


(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("SchemaValidationBasicTests", () => {
    let store: IDocumentStore;

    beforeEach(async () => {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("store - Users collection", async () => {
        const schemaData = getUserSchema();

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        {
            const session = store.openSession();
            await session.store(new User(17))

            try {
                await session.saveChanges();

            } catch (error) {
                assertThat(error.message).contains("17");
                assertThat(error.message).contains("age");
            }
        }

        {
            const session = store.openSession();
            await session.store(new User(80))

            try {
                await session.saveChanges();
            } catch (error) {
                assertThat(error.message).contains("80");
                assertThat(error.message).contains("age");
            }
        }

        {
            const session = store.openSession();
            await session.store(new User(39));
            await session.saveChanges();
        }
    });

    it("store - users collection (lowercase)", async () => {
        const schemaData = getUserSchema();

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        // Test: Age below minimum should fail
        {
            const session = store.openSession();
            await session.store(new User(17));

            try {
                await session.saveChanges();
            } catch (error) {
                assertThat(error.message).contains("17");
            }
        }

        // Test: Valid age should succeed
        {
            const session = store.openSession();
            await session.store(new User(39));
            await session.saveChanges();
        }
    });

    it("store cluster transaction", async function () {
        const schemaData = getUserSchema();

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        // Test: Age below minimum should fail
        {
            const session = store.openSession({transactionMode: "ClusterWide"});
            await session.store(new User(17));

            try {
                await session.saveChanges();

            } catch (error) {
                assertThat(error.message).contains("17");
                assertThat(error.message).contains("age");
            }
        }

        // Test: Age above maximum should fail
        {
            const session = store.openSession({transactionMode: "ClusterWide"});
            await session.store(new User(80));

            try {
                await session.saveChanges();

            } catch (error) {
                assertThat(error.message).contains("80");
                assertThat(error.message).contains("age");
            }
        }

        // Test: Valid age should succeed
        {
            const session = store.openSession({transactionMode: "ClusterWide"});
            await session.store(new User(39));
            await session.saveChanges();
        }

        // Get configuration and modify it
        const currentConfig = await store.maintenance.send(new GetSchemaValidationConfiguration());
        currentConfig.validatorsPerCollection["Companies"] = {
            schema: schemaData
        };
        currentConfig.validatorsPerCollection["Users"].disabled = true;
        await store.maintenance.send(new ConfigureSchemaValidationOperation(currentConfig));

        // Test: With disabled validation, invalid age should succeed
        {
            const session = store.openSession({transactionMode: "ClusterWide"});
            await session.store(new User(20), "users/2");
            await session.saveChanges();
        }
    });

    it("disable schema after creation", async () => {
        const schemaData = getUserSchema();

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    schema: schemaData
                },
                "Orders": {
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        {
            const session = store.openSession();
            await session.store(new User(17));

            try {
                await session.saveChanges();
            } catch (error) {
                assertThat(error.message).contains("17");
                assertThat(error.message).contains("age");
            }
        }

        // Disable validation for Users
        configuration.validatorsPerCollection["Users"].disabled = true;
        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        {
            const session = store.openSession();
            await session.store(new User(80));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.store(new User(39));
            await session.saveChanges();
        }
    });

    it("can start with disabled schema", async () => {
        const schemaData = getUserSchema();

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    disabled: true,
                    schema: schemaData
                },
                "Orders": {
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        // Test: With disabled validation, invalid age should succeed
        {
            const session = store.openSession();
            await session.store(new User(17));
            await session.saveChanges();
        }

        // Enable validation for Users
        configuration.validatorsPerCollection["Users"].disabled = false;
        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        // Test: Now validation is active, invalid age should fail
        {
            const session = store.openSession();
            await session.store(new User(80));
            try {
                await session.saveChanges();
            } catch (error) {
                assertThat(error.message).contains("80");
                assertThat(error.message).contains("age");
            }
        }
    });

    it("can get schema validation configuration", async () => {
        const schemaData = getUserSchema();

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    schema: schemaData
                },
                "Orders": {
                    disabled: true,
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        const retrievedConfig = await store.maintenance.send(new GetSchemaValidationConfiguration());

        assertThat(retrievedConfig).isNotNull();
        assertThat(Object.keys(retrievedConfig.validatorsPerCollection).length).isEqualTo(2);

        assertThat(retrievedConfig.validatorsPerCollection["Users"]).isNotNull();
        assertThat(retrievedConfig.validatorsPerCollection["Users"].schema).isNotNull();
        assertThat(retrievedConfig.validatorsPerCollection["Users"].disabled).isFalse();

        assertThat(retrievedConfig.validatorsPerCollection["Orders"]).isNotNull();
        assertThat(retrievedConfig.validatorsPerCollection["Orders"].disabled).isEqualTo(true);
    });

    it("can update schema validation configuration", async () => {
        const schemaData = getUserSchema();

        const config1: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(config1));

        let config = await store.maintenance.send(new GetSchemaValidationConfiguration());
        assertThat(Object.keys(config.validatorsPerCollection).length).isEqualTo(1);

        const config2: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Orders": {
                    disabled: true,
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(config2));

        config = await store.maintenance.send(new GetSchemaValidationConfiguration());

        assertThat(Object.keys(config.validatorsPerCollection).length).isEqualTo(1);
        assertThat(config.validatorsPerCollection["Orders"]).isNotNull();
        assertThat(config.validatorsPerCollection["Orders"].disabled).isEqualTo(true);
    });

    it("can configure multiple collections", async () => {
        const userSchema = getUserSchema();
        const productSchema = JSON.stringify({
            type: "object",
            properties: {
                name: {type: "string", minLength: 1},
                price: {type: "number", minimum: 0}
            },
            required: ["name", "price"]
        });

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "Users": {
                    schema: userSchema
                },
                "Products": {
                    schema: productSchema
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        const config = await store.maintenance.send(new GetSchemaValidationConfiguration());

        assertThat(Object.keys(config.validatorsPerCollection).length).isEqualTo(2);
        assertThat(config.validatorsPerCollection["Users"]).isNotNull();
        assertThat(config.validatorsPerCollection["Products"]).isNotNull();
    });

    it("validates against complex schema", async () => {
        const complexSchema = JSON.stringify({
            type: "object",
            properties: {
                name: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100
                },
                email: {
                    type: "string",
                    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                },
                age: {
                    type: "integer",
                    minimum: 21,
                    maximum: 67
                },
                address: {
                    type: "object",
                    properties: {
                        street: {type: "string"},
                        city: {type: "string"},
                        zipCode: {type: "string"}
                    },
                    required: ["city"]
                }
            },
            required: ["name", "email", "age"]
        });

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "ComplexUsers": {
                    schema: complexSchema
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        {
            const session = store.openSession();
            const invalidUser = new ComplexUser("John Doe", null, 30, null);
            await session.store(invalidUser);

            try {
                await session.saveChanges();
            } catch (error) {
                assertThat(error.message).contains("email");
            }
        }

        {
            const session = store.openSession();
            const validUser = new ComplexUser(
                "John Doe",
                "john@example.com",
                30,
                new Address("123 Main St", "New York", "10001")
            );
            await session.store(validUser);

            await session.saveChanges();
        }
    });

    it("case insensitive collection names", async () => {
        const schemaData = getUserSchema();

        const configuration: SchemaValidationConfiguration = {
            validatorsPerCollection: {
                "uSeRs": {
                    schema: schemaData
                }
            }
        };

        await store.maintenance.send(new ConfigureSchemaValidationOperation(configuration));

        const config = await store.maintenance.send(new GetSchemaValidationConfiguration());

        assertThat(Object.keys(config.validatorsPerCollection).length).isEqualTo(1);

        const retrievedValidator = config.validatorsPerCollection["uSeRs"];
        assertThat(retrievedValidator).isNotNull();
        assertThat(retrievedValidator.schema).isNotNull();
    });
});

class User {
    public age: number;

    constructor(age: number) {
        this.age = age;
    }
}

class Address {
    public street: string;
    public city: string;
    public zipCode: string;

    constructor(street: string, city: string, zipCode: string) {
        this.street = street;
        this.city = city;
        this.zipCode = zipCode;
    }
}

class ComplexUser {
    public name: string;
    public email: string;
    public age: number;
    public address: Address;

    constructor(name: string, email: string, age: number, address: Address) {
        this.name = name;
        this.email = email;
        this.age = age;
        this.address = address;
    }
}

function getUserSchema(): string {
    return JSON.stringify({
        type: "object",
        properties: {
            age: {
                type: "integer",
                minimum: 21,
                maximum: 67
            }
        },
        required: ["age"]
    });
}