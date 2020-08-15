import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { Company } from "../Assets/Entities";
import { SessionOptions } from "../../src/Documents/Session/SessionOptions";
import { assertThat } from "../Utils/AssertExtensions";
import { GetIndexesOperation } from "../../src/Documents/Operations/Indexes/GetIndexesOperation";
import { AbstractIndexCreationTask } from "../../src/Documents/Indexes/AbstractIndexCreationTask";
import { IndexDefinition } from "../../src/Documents/Indexes/IndexDefinition";

describe("RavenDB_14084", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIndexMissingFieldsAsNull_Static", async () => {
        await new Companies_ByUnknown().execute(store);
        await new Companies_ByUnknown_WithIndexMissingFieldsAsNull().execute(store);

        {
            const session = store.openSession();
            const company = Object.assign(new Company(), {
                name: "HR"
            });
            await session.store(company);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        const sessionOptions: SessionOptions = {
            noCaching: true
        };

        {
            const session = store.openSession(sessionOptions);

            const companies = await session.query<Company>({ documentType: Company, indexName: new Companies_ByUnknown().getIndexName() })
                .whereEquals("Unknown", null)
                .all();

            assertThat(companies)
                .hasSize(0);
        }

        {
            const session = store.openSession(sessionOptions);
            const companies = await session.query<Company>({ documentType: Company, indexName: new Companies_ByUnknown_WithIndexMissingFieldsAsNull().getIndexName() })
                .whereEquals("Unknown", null)
                .all();

            assertThat(companies)
                .hasSize(1);
        }

        const indexDefinitions = await store.maintenance.send(new GetIndexesOperation(0, 10));
        assertThat(indexDefinitions)
            .hasSize(2);

        const configuration = indexDefinitions
            .find(x => x.name === "Companies/ByUnknown/WithIndexMissingFieldsAsNull")
            .configuration;

        assertThat(configuration)
            .hasSize(1)
            .containsEntry("Indexing.IndexMissingFieldsAsNull", "true");
    });

});

class Companies_ByUnknown extends AbstractIndexCreationTask {
    createIndexDefinition(): IndexDefinition {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "Companies/ByUnknown";
        indexDefinition.maps = new Set(["from c in docs.Companies select new { Unknown = c.Unknown };"]);

        return indexDefinition;
    }
}

class Companies_ByUnknown_WithIndexMissingFieldsAsNull extends AbstractIndexCreationTask {
    createIndexDefinition(): IndexDefinition {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "Companies/ByUnknown/WithIndexMissingFieldsAsNull";
        indexDefinition.maps = new Set(["from c in docs.Companies select new { Unknown = c.Unknown };"]);
        indexDefinition.configuration = {
            "Indexing.IndexMissingFieldsAsNull": "true"
        };

        return indexDefinition;
    }
}
