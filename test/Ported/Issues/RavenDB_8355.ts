import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { SorterDefinition } from "../../../src/Documents/Queries/Sorting/SorterDefinition";
import { PutSortersOperation } from "../../../src/Documents/Operations/Sorters/PutSortersOperation";
import { Company } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { DeleteSorterOperation } from "../../../src/Documents/Operations/Sorters/DeleteSorterOperation";
import { RavenErrorType } from "../../../src/Exceptions/index";
import { DocumentStore } from "../../../src/Documents/DocumentStore";

describe("RavenDB_8355", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseCustomSorter", async () => {
        const sorterDefinition: SorterDefinition = {
            code: sorterCode,
            name: "MySorter"
        };

        const operation = new PutSortersOperation(sorterDefinition);

        await store.maintenance.send(operation);

        {
            const session = store.openSession();
            const company1 = Object.assign(new Company(), { name: "C1" });
            await session.store(company1);

            const company2 = Object.assign(new Company(), { name: "C2" });
            await session.store(company2);

            await session.saveChanges();
        }

        await canUseSorterInternal("RavenException", store, "Catch me: name:2:0:False", "Catch me: name:2:0:True");
    });

    it("canUseCustomSorterWithOperations", async () => {
        {
            const session = store.openSession();
            const company1 = Object.assign(new Company(), { name: "C1" });
            await session.store(company1);

            const company2 = Object.assign(new Company(), { name: "C2" });
            await session.store(company2);

            await session.saveChanges();
        }

        await canUseSorterInternal("SorterDoesNotExistException", store, "There is no sorter with 'MySorter' name", "There is no sorter with 'MySorter' name");

        const sorterDefinition: SorterDefinition = {
            name: "MySorter",
            code: sorterCode
        };

        const operation = new PutSortersOperation(sorterDefinition);
        await store.maintenance.send(operation);

        // checking if we can send again same sorter

        await store.maintenance.send(new PutSortersOperation(sorterDefinition));

        await canUseSorterInternal("RavenException", store, "Catch me: name:2:0:False", "Catch me: name:2:0:True");

        const newSorterCode = sorterCode.replace(/Catch me/g, "Catch me 2");

        // checking if we can update sorter
        const sorterDefinition2: SorterDefinition = {
            name: "MySorter",
            code: newSorterCode
        };

        await store.maintenance.send(new PutSortersOperation(sorterDefinition2));

        await assertThrows(async () => {
            // We should not be able to add sorter with non-matching name
            const otherDefinition: SorterDefinition = {
                name: "MySorter_OtherName",
                code: sorterCode
            };

            await store.maintenance.send(new PutSortersOperation(otherDefinition));
        }, err => {
            assertThat(err.message)
                .contains("Could not find type 'MySorter_OtherName' in given assembly.");
            assertThat(err.name)
                .isEqualTo("SorterCompilationException");
        });

        await canUseSorterInternal("RavenException", store, "Catch me 2: name:2:0:False", "Catch me 2: name:2:0:True");

        await store.maintenance.send(new DeleteSorterOperation("MySorter"));

        await canUseSorterInternal("SorterDoesNotExistException", store, "There is no sorter with 'MySorter' name", "There is no sorter with 'MySorter' name");
    });
});

async function canUseSorterInternal(exceptionClass: RavenErrorType, store: DocumentStore, asc: string, desc: string) {
    {
        const session = store.openSession();

        await assertThrows(async () => {
            await session.advanced.rawQuery("from Companies order by custom(name, 'MySorter')", Company)
                .all();
        }, err => {
            assertThat(err.name)
                .isEqualTo(exceptionClass);
            assertThat(err.message)
                .contains(asc);
        });

        await assertThrows(async () => {
            await session.query<Company>({ documentType: Company })
                .orderBy("name", { sorterName: "MySorter" })
                .all();
        }, err => {
            assertThat(err.name)
                .isEqualTo(exceptionClass);
            assertThat(err.message)
                .contains(asc);
        });

        await assertThrows(async () => {
            await session.advanced.rawQuery("from Companies order by custom(name, 'MySorter') desc", Company)
                .all();
        }, err => {
            assertThat(err.name)
                .isEqualTo(exceptionClass);
            assertThat(err.message)
                .contains(desc);
        });

        await assertThrows(async () => {
            await session.query<Company>({ documentType: Company })
                .orderByDescending("name", { sorterName: "MySorter" })
                .all();
        }, err => {
            assertThat(err.name)
                .isEqualTo(exceptionClass);
            assertThat(err.message)
                .contains(desc);
        });
    }
}

const sorterCode = `using System;
using System.Collections.Generic;
using Lucene.Net.Index;
using Lucene.Net.Search;
using Lucene.Net.Store;

namespace SlowTests.Data.RavenDB_8355
{
    public class MySorter : FieldComparator
    {
        private readonly string _args;

        public MySorter(string fieldName, int numHits, int sortPos, bool reversed, List<string> diagnostics)
        {
            _args = $"{fieldName}:{numHits}:{sortPos}:{reversed}";
        }

        public override int Compare(int slot1, int slot2)
        {
            throw new InvalidOperationException($"Catch me: {_args}");
        }

        public override void SetBottom(int slot)
        {
            throw new InvalidOperationException($"Catch me: {_args}");
        }

        public override int CompareBottom(int doc, IState state)
        {
            throw new InvalidOperationException($"Catch me: {_args}");
        }

        public override void Copy(int slot, int doc, IState state)
        {
            throw new InvalidOperationException($"Catch me: {_args}");
        }

        public override void SetNextReader(IndexReader reader, int docBase, IState state)
        {
            throw new InvalidOperationException($"Catch me: {_args}");
        }

        public override IComparable this[int slot] => throw new InvalidOperationException($"Catch me: {_args}");
    }
}
`;
