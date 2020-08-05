import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";
import { QueryData } from "../../../src/Documents/Queries/QueryData";
import { DocumentResultStream } from "../../../src/Documents/Session/DocumentResultStream";
import * as StreamUtil from "../../../src/Utility/StreamUtil";

describe("RavenDB_14272", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("select_Fields2", async () => {
        const userTalk = await saveUserTalk(store);

        {
            const session = store.openSession();
            const result = await session.query(UserTalk)
                .selectFields<TalkUserIds>(["userDefs"], TalkUserIds)
                .all();

            assertThat(result)
                .hasSize(1);
            assertThat(result[0].userDefs.size)
                .isEqualTo(2);
            assertThat(result[0].userDefs.keys())
                .isEqualTo(userTalk.userDefs.keys());
        }
    });

    it("select_Fields3", async () => {
        const userTalk = await saveUserTalk(store);

        {
            const session = store.openSession();

            const queryData = new QueryData(["userDefs"], ["userDefs"]);

            const result = await session.query(UserTalk)
                .selectFields<TalkUserIds>(queryData, TalkUserIds)
                .all();

            assertThat(result)
                .hasSize(1);
            assertThat(result[0].userDefs.size)
                .isEqualTo(2);
            assertThat(result[0].userDefs.keys())
                .isEqualTo(userTalk.userDefs.keys());
        }
    });

    it("select_Fields4", async () => {
        const userTalk = await saveUserTalk(store);

        {
            const session = store.openSession();

            const result = await session.query(UserTalk)
                .selectFields<string>("name")
                .all();

            assertThat(result)
                .hasSize(1);
            assertThat(result[0])
                .isEqualTo(userTalk.name);
        }
    });

    it("streaming_query_projection", async () => {
        const userTalk = await saveUserTalk(store);

        {
            const session = store.openSession();

            const query = session.query(UserTalk)
                .selectFields<TalkUserIds>("userDefs", TalkUserIds);

            const queryStream: DocumentResultStream<TalkUserIds> = await session.advanced.stream(query);

            const items = [];

            queryStream.on("data", item => {
                items.push(item);
                const projection: TalkUserIds = item.document.data; //TODO: check me!

                assertThat(projection)
                    .isNotNull();
                assertThat(projection.userDefs)
                    .isNotNull();
                assertThat(projection.userDefs)
                    .hasSize(2);

                assertThat(projection[0].userDefs.keys())
                    .isEqualTo(userTalk.userDefs.keys());
            });

            await StreamUtil.finishedAsync(queryStream);

            assertThat(items)
                .hasSize(1);
        }
    });
});

async function saveUserTalk(store: IDocumentStore) {
    const userTalk = new UserTalk();

    const userDefs = new Map<string, TalkUserDef>();
    userDefs.set("test1", new TalkUserDef());
    userDefs.set("test2", new TalkUserDef());

    userTalk.userDefs = userDefs;
    userTalk.name = "Grisha";

    {
        const session = store.openSession();
        await session.store(userTalk);
        await session.saveChanges();
    }

    return userTalk;
}

class UserTalk {
    public userDefs: Map<string, TalkUserDef>;
    public name: string;
}

class TalkUserIds {
    public userDefs: Map<string, TalkUserDef>;
}

class TalkUserDef {
    public a: string;
}

