import { IDocumentStore, SorterDefinition } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company } from "../../Assets/Entities";
import { PutServerWideSortersOperation } from "../../../src/ServerWide/Operations/Sorters/PutServerWideSortersOperation";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { DeleteServerWideSorterOperation } from "../../../src/ServerWide/Operations/Sorters/DeleteServerWideSorterOperation";
import { sorterCode } from "./RavenDB_8355";

describe("RavenDB_16328", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseCustomSorter", async () => {
        {
            const session = store.openSession();
            const company1 = Object.assign(new Company(), { name: "C1" });
            await session.store(company1);

            const company2 = Object.assign(new Company(), { name: "C2" });
            await session.store(company2);

            await session.saveChanges();
        }

        const sorterName = store.database;
        let sorterCode = getSorter(sorterName);

        const sorterDefinition: SorterDefinition = {
            name: sorterName,
            code: sorterCode
        };

        await store.maintenance.server.send(new PutServerWideSortersOperation(sorterDefinition));
        try {

            // checking if we can send again same sorter
            await store.maintenance.server.send(new PutServerWideSortersOperation(sorterDefinition));

            sorterCode = sorterCode.replace(/Catch me/g, "Catch me 2");

            // checking if we can update sorter
            const updatedSorter: SorterDefinition = {
                name: sorterName,
                code: sorterCode
            };

            await store.maintenance.server.send(new PutServerWideSortersOperation(updatedSorter));

            // We should not be able to add sorter with non-matching name
            await assertThrows(async () => {
                const invalidSorter: SorterDefinition = {
                    name: sorterName + "_OtherName",
                    code: sorterCode
                };

                await store.maintenance.server.send(new PutServerWideSortersOperation(invalidSorter));
            }, err => {
                assertThat(err.name)
                    .isEqualTo("SorterCompilationException");
            });
        } finally {
            await store.maintenance.server.send(new DeleteServerWideSorterOperation(sorterName));
        }
    });
});

function getSorter(sorterName: string) {
    return sorterCode.replace(/MySorter/g, sorterName);
}