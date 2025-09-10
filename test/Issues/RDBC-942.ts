import {IDocumentStore, SessionOptions} from "../../src/index.js";
import {disposeTestDocumentStore, testContext} from "../Utils/TestUtil.js";
import {assertThat} from "../Utils/AssertExtensions.js";

describe("RDBC-942", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetCompareExchangeValuesWithNumberType", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        const testNumbers = [42, 3.14, -100, 0, Number.MAX_SAFE_INTEGER];

        {
            const session = store.openSession(sessionOptions);
            for (let i = 0; i < testNumbers.length; i++) {
                session.advanced.clusterTransaction.createCompareExchangeValue<number>(`test/number-${i}`, testNumbers[i]);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const keys = testNumbers.map((_, i) => `test/number-${i}`);
            const lazyValues = session.advanced.clusterTransaction.lazily.getCompareExchangeValues(keys);

            const values = await lazyValues.getValue();

            assertThat(values)
                .isNotNull()
                .hasSize(testNumbers.length);

            for (let i = 0; i < testNumbers.length; i++) {
                const key = `test/number-${i}`;
                assertThat(values)
                    .containsKey(key);

                assertThat(values[key])
                    .isNotNull();

                assertThat(values[key].value)
                    .isEqualTo(testNumbers[i]);
            }
        }
    });

    it("canGetCompareExchangeValuesWithStringType", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        const testStrings = ["hello world", "", "special chars: !@#$%^&*()", "unicode: 🚀 测试", "json-like: {\"key\": \"value\"}"];

        {
            const session = store.openSession(sessionOptions);
            for (let i = 0; i < testStrings.length; i++) {
                session.advanced.clusterTransaction.createCompareExchangeValue<string>(`test/string-${i}`, testStrings[i]);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const keys = testStrings.map((_, i) => `test/string-${i}`);
            const lazyValues = session.advanced.clusterTransaction.lazily.getCompareExchangeValues(keys);

            const values = await lazyValues.getValue();

            assertThat(values)
                .isNotNull()
                .hasSize(testStrings.length);

            for (let i = 0; i < testStrings.length; i++) {
                const key = `test/string-${i}`;
                assertThat(values)
                    .containsKey(key);

                assertThat(values[key])
                    .isNotNull();

                assertThat(values[key].value)
                    .isEqualTo(testStrings[i]);
            }
        }
    });

    it("canGetCompareExchangeValuesWithArrayType", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        const testArrays = [
            [1, 2, 3, 4, 5],
            ["a", "b", "c"],
            [true, false, null],
            [{ id: 1, name: "item1" }, { id: 2, name: "item2" }],
            []
        ];

        {
            const session = store.openSession(sessionOptions);
            for (let i = 0; i < testArrays.length; i++) {
                session.advanced.clusterTransaction.createCompareExchangeValue<any[]>(`test/array-${i}`, testArrays[i]);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const keys = testArrays.map((_, i) => `test/array-${i}`);
            const lazyValues = session.advanced.clusterTransaction.lazily.getCompareExchangeValues(keys);

            const values = await lazyValues.getValue();

            assertThat(values)
                .isNotNull()
                .hasSize(testArrays.length);

            for (let i = 0; i < testArrays.length; i++) {
                const key = `test/array-${i}`;
                assertThat(values)
                    .containsKey(key);

                assertThat(values[key])
                    .isNotNull();

                const expectedArray = testArrays[i];
                const actualArray = values[key].value;
                assertThat(JSON.stringify(actualArray))
                    .isEqualTo(JSON.stringify(expectedArray));
            }
        }
    });

    it("canGetCompareExchangeValuesWithJsonObjectType", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        const testObjects = [
            { name: "John", age: 30, active: true },
            { number: 123, metadata: { created: "2023-01-01", tags: ["tag1", "tag2"] } },
            { nested: { deep: { value: "found" } } },
            { numbers: [1, 2, 3], strings: ["a", "b"], mixed: { count: 5, valid: true } },
            {}
        ];

        {
            const session = store.openSession(sessionOptions);
            for (let i = 0; i < testObjects.length; i++) {
                session.advanced.clusterTransaction.createCompareExchangeValue<any>(`test/object-${i}`, testObjects[i]);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const keys = testObjects.map((_, i) => `test/object-${i}`);
            const lazyValues = session.advanced.clusterTransaction.lazily.getCompareExchangeValues(keys);

            const values = await lazyValues.getValue();

            assertThat(values)
                .isNotNull()
                .hasSize(testObjects.length);

            for (let i = 0; i < testObjects.length; i++) {
                const key = `test/object-${i}`;
                assertThat(values)
                    .containsKey(key);

                assertThat(values[key])
                    .isNotNull();

                const expectedObject = testObjects[i];
                const actualObject = values[key].value;
                assertThat(JSON.stringify(actualObject))
                    .isEqualTo(JSON.stringify(expectedObject));
            }
        }
    });

    it("canGetCompareExchangeValuesWithMixedTypes", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        const testValues = [
            { key: "test/mixed-number", value: 42 },
            { key: "test/mixed-string", value: "hello world" },
            { key: "test/mixed-array", value: [1, "two", { three: 3 }] },
            { key: "test/mixed-object", value: { name: "test", count: 100, active: true } },
            { key: "test/mixed-null", value: null },
            { key: "test/mixed-boolean", value: true }
        ];

        {
            const session = store.openSession(sessionOptions);
            for (const item of testValues) {
                session.advanced.clusterTransaction.createCompareExchangeValue<any>(item.key, item.value);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession(sessionOptions);
            const keys = testValues.map(item => item.key);
            const lazyValues = session.advanced.clusterTransaction.lazily.getCompareExchangeValues(keys);

            const values = await lazyValues.getValue();

            assertThat(values)
                .isNotNull()
                .hasSize(testValues.length);

            for (const item of testValues) {
                assertThat(values)
                    .containsKey(item.key);

                assertThat(values[item.key])
                    .isNotNull();

                if (item.value === null) {
                    assertThat(values[item.key].value)
                        .isNull();
                } else if (typeof item.value === 'object') {
                    assertThat(JSON.stringify(values[item.key].value))
                        .isEqualTo(JSON.stringify(item.value));
                } else {
                    assertThat(values[item.key].value)
                        .isEqualTo(item.value);
                }
            }
        }
    });
});
