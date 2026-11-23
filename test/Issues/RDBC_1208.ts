import { IDocumentStore } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat } from "../Utils/AssertExtensions.js";

class Item {
    public id: string;
    public value: unknown;
}

const falsyChanges: [unknown, unknown][] = [
    [0, null],
    [false, null],
    ["", null],
    [0, false],
    [false, ""],
];

describe("RDBC-1208 falsy value changes", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    for (const [oldValue, newValue] of falsyChanges) {
        const label = `${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`;

        it(`document field ${label} is reported and saved`, async () => {
            {
                const session = store.openSession();
                await session.store(Object.assign(new Item(), { value: oldValue }), "items/1");
                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const item = await session.load("items/1", Item);
                item.value = newValue;

                const changes = session.advanced.whatChanged()["items/1"];
                assertThat(changes).hasSize(1);
                assertThat(changes[0].change).isEqualTo("FieldChanged");
                assertThat(changes[0].fieldName).isEqualTo("value");

                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const item = await session.load("items/1", Item);
                assertThat(item.value).isEqualTo(newValue);
            }
        });

        it(`metadata value ${label} is reported and saved`, async () => {
            {
                const session = store.openSession();
                const item = new Item();
                await session.store(item, "items/1");
                session.advanced.getMetadataFor(item)["Value"] = oldValue;
                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const item = await session.load("items/1", Item);
                session.advanced.getMetadataFor(item)["Value"] = newValue;

                const changes = session.advanced.whatChanged()["items/1"];
                assertThat(changes).hasSize(1);
                assertThat(changes[0].change).isEqualTo("FieldChanged");
                assertThat(changes[0].fieldName).isEqualTo("Value");

                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const item = await session.load("items/1", Item);
                assertThat(session.advanced.getMetadataFor(item)["Value"]).isEqualTo(newValue);
            }
        });
    }
});
