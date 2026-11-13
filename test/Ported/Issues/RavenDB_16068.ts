import {
    BulkOperationResult,
    DeleteByQueryOperation,
    IDocumentStore,
    OperationStatusFetchMode,
    PatchByQueryOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

for (const fetchMode of ["Polling", "ChangesApi"] as OperationStatusFetchMode[]) {
    describe(`RavenDB_16068 (${fetchMode})`, function () {

        let store: IDocumentStore;

        beforeEach(async function () {
            testContext.customizeStore = async s => {
                s.conventions.operationStatusFetchMode = fetchMode;
            };
            store = await testContext.getDocumentStore();
        });

        afterEach(async () => {
            testContext.customizeStore = null;
            await disposeTestDocumentStore(store);
        });

        async function bulkInsertUsers(ids: (string | null)[]) {
            const bulkInsert = store.bulkInsert();
            for (const id of ids) {
                if (id) {
                    await bulkInsert.store(new User(), id);
                } else {
                    await bulkInsert.store(new User());
                }
            }
            await bulkInsert.finish();
        }

        function idInQuery(baseQuery: string, ids: string[]) {
            return `${baseQuery} where id() in (${ids.map(id => `'${id}'`).join(",")})`;
        }

        async function countUsers() {
            const session = store.openSession();
            return session.query(User).count();
        }

        for (const baseQuery of ["from Users", "from @all_docs"]) {
            describe(baseQuery, function () {

                it("patchByIdQuery", async () => {
                    const ids = Array.from({ length: 1200 }, (_, i) => String(i + 1));
                    await bulkInsertUsers(ids);

                    const operation = await store.operations.send(new DeleteByQueryOperation(idInQuery(baseQuery, ids)));
                    const result = await operation.waitForCompletion<BulkOperationResult>(30_000);

                    assertThat(result.total).isEqualTo(1200);
                    assertThat(await countUsers()).isEqualTo(0);
                });

                it("deleteByIdQuery", async () => {
                    const ids = Array.from({ length: 1200 }, (_, i) => String(i));
                    await bulkInsertUsers(ids);

                    const operation = await store.operations.send(new DeleteByQueryOperation(idInQuery(baseQuery, ids)));
                    await operation.waitForCompletion<BulkOperationResult>(30_000);

                    assertThat(await countUsers()).isEqualTo(0);
                });

                it("patchByStartsWithQuery", async () => {
                    const totalDocs = 1024 * 2;
                    await bulkInsertUsers(Array.from({ length: totalDocs }, () => null));

                    const operation = await store.operations.send(new PatchByQueryOperation(`${baseQuery} where startsWith(id(), 'users/') update { this.name = 'Grisha' }`));
                    const result = await operation.waitForCompletion<BulkOperationResult>(30_000);

                    assertThat(result.total).isEqualTo(totalDocs);

                    const session = store.openSession();
                    const users = await session.query(User).all();
                    assertThat(users).hasSize(totalDocs);
                    assertThat(users.every(user => user.name === "Grisha")).isTrue();
                });

                it("deleteByStartsWithQuery", async () => {
                    await bulkInsertUsers(Array.from({ length: 1024 * 2 }, () => null));

                    const operation = await store.operations.send(new DeleteByQueryOperation(`${baseQuery} where startsWith(id(), 'users/')`));
                    await operation.waitForCompletion<BulkOperationResult>(30_000);

                    assertThat(await countUsers()).isEqualTo(0);
                });
            });
        }
    });
}
