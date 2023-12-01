import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";


describe("RavenDB_17154Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("invokeOnAfterConversionToEntityAfterTrackingEntityInSession", async () => {
        let listenerOneCalled = 0;
        let listenerOneDocExists = 0;
        let listenerTwoCalled = 0;
        let listenerTwoDocExists = 0;

        {
            // register listener 1
            store.addSessionListener("afterConversionToEntity", event => {
                listenerOneCalled++;
                const metadata = event.session.getMetadataFor(event.entity);
                if (metadata) {
                    listenerOneDocExists++;
                }
            });

            {
                const session = store.openSession();
                const entity = new Entity();
                entity.id = "bob";
                entity.name = "bob";
                await session.store(entity);
                await session.saveChanges();
            }

            // first load
            {
                const session = store.openSession();
                // register listener 2
                session.advanced.on("afterConversionToEntity", event => {
                    listenerTwoCalled++;
                    const metadata = event.session.getMetadataFor(event.entity);
                    if (metadata) {
                        listenerTwoDocExists++;
                    }
                });

                const entity = await session.load("bob", Entity);
                assertThat(entity.id)
                    .isEqualTo("bob");
            }

            // second load
            {
                const session = store.openSession();
                // register listener 2
                session.advanced.on("afterConversionToEntity", event => {
                    listenerTwoCalled++;
                    const metadata = event.session.getMetadataFor(event.entity);
                    if (metadata) {
                        listenerTwoDocExists++;
                    }
                });

                const entity = await session.load("bob", Entity);
                assertThat(entity.id)
                    .isEqualTo("bob");
            }

            assertThat(listenerOneCalled)
                .isEqualTo(2);
            assertThat(listenerTwoCalled)
                .isEqualTo(2);
            assertThat(listenerOneDocExists)
                .isEqualTo(2);
            assertThat(listenerTwoDocExists)
                .isEqualTo(2);
        }
    });
});

class Entity {
    id: string;
    name: string;
}
