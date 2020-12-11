import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import {
    AfterConversionToDocumentEventArgs, AfterConversionToEntityEventArgs,
    BeforeConversionToDocumentEventArgs, BeforeConversionToEntityEventArgs
} from "../../../src/Documents/Session/SessionEvents";
import { ObjectUtil } from "../../../src/Utility/ObjectUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_9889", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseToDocumentConversionEvents", async () => {
        store.addSessionListener("beforeConversionToDocument", (event: BeforeConversionToDocumentEventArgs) => {
            if (event.entity instanceof Item) {
                const item = event.entity;
                item.before = true;
            }
        });

        store.addSessionListener("afterConversionToDocument", (event: AfterConversionToDocumentEventArgs) => {
            if (event.entity instanceof Item) {
                const item = event.entity;
                const document = ObjectUtil.clone(event.document.value);
                document.after = true;

                event.document.value = document;

                item.after = true;
            }
        });

        {
            const session = store.openSession();
            await session.store(new Item(), "items/1");
            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
        }

        {
            const session = store.openSession();

            const item = await session.load<Item>("items/1", Item);

            assertThat(item)
                .isNotNull();
            assertThat(item.before)
                .isTrue();
            assertThat(item.after)
                .isTrue();
        }
    });

    it("canUseToEntityConversionEvents", async () => {
        store.addSessionListener("beforeConversionToEntity", (event: BeforeConversionToEntityEventArgs) => {
            const document = ObjectUtil.clone(event.document) as Item;

            document.before = true;
            event.document = document;
        });

        store.addSessionListener("afterConversionToEntity", (event: AfterConversionToEntityEventArgs) => {
            if (event.entity instanceof Item) {
                const item = event.entity as Item;
                item.after = true;
            }

            if (event.entity instanceof ProjectedItem) {
                const projectedItem = event.entity as ProjectedItem;
                projectedItem.after = true;
            }
        });

        {
            const session = store.openSession();
            await session.store(new Item(), "items/1");
            await session.store(new Item(), "items/2");
            await session.saveChanges();
        }

        // load
        {
            const session = store.openSession();
            const item = await session.load<Item>("items/1", Item);
            assertThat(item)
                .isNotNull();
            assertThat(item.before)
                .isTrue();
            assertThat(item.after)
                .isTrue();
        }

        // queries
        {
            const session = store.openSession();
            const items = await session.query(Item).all();

            assertThat(items)
                .hasSize(2);

            for (const item of items) {
                assertThat(item.before)
                    .isTrue();
                assertThat(item.after)
                    .isTrue();
            }
        }

        // projections in queries

        {
            const session = store.openSession();
            const items = await session.query(Item)
                .selectFields<ProjectedItem>(["before", "after"], ProjectedItem)
                .all();

            assertThat(items)
                .hasSize(2);

            for (const item of items) {
                assertThat(item.before)
                    .isTrue();
                assertThat(item.after)
                    .isTrue();
            }
        }
    });
});


class Item {
    public id: string;
    public before: boolean;
    public after: boolean;
}

class ProjectedItem {
    public before: boolean;
    public after: boolean;
}