import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../Utils/TestUtil";
import { Company } from "../Assets/Entities";
import { assertThat, assertThrows } from "../Utils/AssertExtensions";
import { RevisionsConfiguration } from "../../src/Documents/Operations/RevisionsConfiguration";
import { RevisionsCollectionConfiguration } from "../../src/Documents/Operations/RevisionsCollectionConfiguration";
import { ConfigureRevisionsOperation } from "../../src/Documents/Operations/Revisions/ConfigureRevisionsOperation";

(RavenTestContext.is60Server || RavenTestContext.isPullRequest ? describe.skip : describe)("ForceRevisionCreation", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("forceRevisionCreationForSingleUnTrackedEntityByID", async () => {
        let companyId: string;

        {
            const session = store.openSession();

            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);

            companyId = company.id;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.revisions.forceRevisionCreationFor(companyId);
            await session.saveChanges();

            const revisionsCount = (await session.advanced.revisions.getFor(companyId, { documentType: Company })).length;
            assertThat(revisionsCount)
                .isEqualTo(1);
        }
    });

    it("forceRevisionCreationForMultipleUnTrackedEntitiesByID", async () => {
        let companyId1: string;
        let companyId2: string;

        {
            const session = store.openSession();

            const company1 = Object.assign(new Company(), {
                name: "HR1"
            });

            const company2 = Object.assign(new Company(), {
                name: "HR2"
            });

            await session.store(company1);
            await session.store(company2);

            companyId1 = company1.id;
            companyId2 = company2.id;

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.revisions.forceRevisionCreationFor(companyId1);
            session.advanced.revisions.forceRevisionCreationFor(companyId2);

            await session.saveChanges();

            const revisionsCount1 = (await session.advanced.revisions.getFor<Company>(companyId1)).length;
            const revisionsCount2 = (await session.advanced.revisions.getFor<Company>(companyId2)).length;

            assertThat(revisionsCount1)
                .isEqualTo(1);
            assertThat(revisionsCount2)
                .isEqualTo(1);
        }
    });

    it("cannotForceRevisionCreationForUnTrackedEntityByEntity", async () => {
        {
            const session = store.openSession();

            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await assertThrows(() => {
                session.advanced.revisions.forceRevisionCreationFor(company)
            }, err => {
                assertThat(err.name)
                    .isEqualTo("InvalidOperationException");
                assertThat(err.message)
                    .contains("Cannot create a revision for the requested entity because it is Not tracked by the session");
            });
        }
    });

    it("forceRevisionCreationForNewDocumentByEntity", async () => {
        {
            const session = store.openSession();
            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);
            await session.saveChanges();

            session.advanced.revisions.forceRevisionCreationFor(company);

            let revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isZero();

            await session.saveChanges();

            revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isEqualTo(1);
        }
    });

    it("cannotForceRevisionCreationForNewDocumentBeforeSavingToServerByEntity", async () => {
        {
            const session = store.openSession();

            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);

            session.advanced.revisions.forceRevisionCreationFor(company);

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("Can't force revision creation - the document was not saved on the server yet");
            });

            const revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isZero();
        }
    });

    it("forceRevisionCreationForTrackedEntityWithNoChangesByEntity", async () => {
        let companyId = "";

        {
            const session = store.openSession();
            // 1. store document
            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);
            await session.saveChanges();

            companyId = company.id;

            const revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isZero();
        }

        {
            const session = store.openSession();

            // 2. Load & Save without making changes to the document
            const company = await session.load<Company>(companyId, Company);

            session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            const revisionsCount = (await session.advanced.revisions.getFor<Company>(companyId)).length;
            assertThat(revisionsCount)
                .isEqualTo(1);
        }
    });

    it("forceRevisionCreationForTrackedEntityWithChangesByEntity", async () => {
        let companyId = "";

        // 1. store document
        {
            const session = store.openSession();

            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);
            await session.saveChanges();

            companyId = company.id;

            const revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isZero();
        }

        // 2. Load, Make changes & Save
        {
            const session = store.openSession();
            const company = await session.load<Company>(companyId, Company);
            company.name = "HR V2";

            session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<Company>(company.id);
            const revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(1);

            // Assert revision contains the value 'Before' the changes...
            // ('Before' is the default force revision creation strategy)
            assertThat(revisions[0].name)
                .isEqualTo("HR");
        }
    });

    it("forceRevisionCreationForTrackedEntityWithChangesByID", async () => {
        let companyId = "";

        // 1. Store document
        {
            const session = store.openSession();
            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);
            await session.saveChanges();

            companyId = company.id;

            const revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isZero();
        }

        {
            const session = store.openSession();
            // 2. Load, Make changes & Save

            const company = await session.load<Company>(companyId, Company);
            company.name = "HR V2";

            session.advanced.revisions.forceRevisionCreationFor(company.id);
            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<Company>(company.id);
            const revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(1);

            // Assert revision contains the value 'Before' the changes...
            assertThat(revisions[0].name)
                .isEqualTo("HR");
        }
    });

    it("forceRevisionCreationMultipleRequests", async () => {
        let companyId = "";

        {
            const session = store.openSession();
            const company = Object.assign(new Company(), {
                name: "HR"
            });
            await session.store(company);
            await session.saveChanges();

            companyId = company.id;

            const revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isZero();
        }

        {
            const session = store.openSession();
            session.advanced.revisions.forceRevisionCreationFor(companyId);

            const company = await session.load<Company>(companyId, Company);
            company.name = "HR V2";

            session.advanced.revisions.forceRevisionCreationFor(company);
            // The above request should not throw - we ignore duplicate requests with SAME strategy

            await assertThrows(() => session.advanced.revisions.forceRevisionCreationFor(company.id, "None"), err => {
                assertThat(err.name)
                    .isEqualTo("InvalidOperationException");
                assertThat(err.message)
                    .contains("A request for creating a revision was already made for document");
            });

            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<Company>(company.id);
            const revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(1);

            assertThat(revisions[0].name)
                .isEqualTo("HR");
        }
    });

    it("forceRevisionCreationAcrossMultipleSessions", async () => {
        let companyId = "";

        {
            const session = store.openSession();

            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);
            await session.saveChanges();

            companyId = company.id;

            let revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isZero();

            session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isEqualTo(1);

            // Verify that another 'force' request will not create another revision
            session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isEqualTo(1);
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>(companyId, Company);
            company.name = "HR V2";

            await session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            let revisions = await session.advanced.revisions.getFor<Company>(company.id);
            let revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(1);

            // Assert revision contains the value 'Before' the changes...
            assertThat(revisions[0].name)
                .isEqualTo("HR");

            session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            revisions = await session.advanced.revisions.getFor<Company>(company.id);
            revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(2);

            // Assert revision contains the value 'Before' the changes...
            assertThat(revisions[0].name)
                .isEqualTo("HR V2");
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>(companyId, Company);
            company.name = "HR V3";
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.revisions.forceRevisionCreationFor(companyId);
            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<Company>(companyId);
            const revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(3);
            assertThat(revisions[0].name)
                .isEqualTo("HR V3");
        }
    });

    it("forceRevisionCreationWhenRevisionConfigurationIsSet", async () => {
        // Define revisions settings
        const configuration = new RevisionsConfiguration();

        const companiesConfiguration = Object.assign(new RevisionsCollectionConfiguration(), {
            purgeOnDelete: true,
            minimumRevisionsToKeep: 5
        } as Partial<RevisionsCollectionConfiguration>);

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("Companies", companiesConfiguration);

        const result = await store.maintenance.send(new ConfigureRevisionsOperation(configuration));

        let companyId = "";

        {
            const session = store.openSession();
            const company = Object.assign(new Company(), {
                name: "HR"
            });

            await session.store(company);

            companyId = company.id;
            await session.saveChanges();

            let revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isEqualTo(1); // one revision because configuration is set

            session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            revisionsCount = (await session.advanced.revisions.getFor<Company>(company.id)).length;
            assertThat(revisionsCount)
                .isEqualTo(1); // no new revision created - already exists due to configuration settings

            session.advanced.revisions.forceRevisionCreationFor(company);
            await session.saveChanges();

            company.name = "HR V2";
            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<Company>(companyId);
            revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(2);
            assertThat(revisions[0].name)
                .isEqualTo("HR V2");
        }

        {
            const session = store.openSession();
            session.advanced.revisions.forceRevisionCreationFor(companyId);
            await session.saveChanges();

            const revisions = await session.advanced.revisions.getFor<Company>(companyId);
            const revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(2);

            assertThat(revisions[0].name)
                .isEqualTo("HR V2");
        }
    });

    it("hasRevisionsFlagIsCreatedWhenForcingRevisionForDocumentThatHasNoRevisionsYet", async () => {
        let company1Id = "";
        let company2Id = "";

        {
            const session = store.openSession();

            const company1 = Object.assign(new Company(), {
                name: "HR1"
            });

            const company2 = Object.assign(new Company(), {
                name: "HR2"
            });

            await session.store(company1);
            await session.store(company2);

            await session.saveChanges();

            company1Id = company1.id;
            company2Id = company2.id;

            let revisionsCount = (await session.advanced.revisions.getFor<Company>(company1.id)).length;
            assertThat(revisionsCount)
                .isZero();

            revisionsCount = (await session.advanced.revisions.getFor<Company>(company2.id)).length;
            assertThat(revisionsCount)
                .isZero();
        }

        {
            const session = store.openSession();

            // Force revision with no changes on document
            session.advanced.revisions.forceRevisionCreationFor(company1Id);

            // Force revision with changes on document
            session.advanced.revisions.forceRevisionCreationFor(company2Id);
            const company2 = await session.load<Company>(company2Id, Company);

            company2.name = "HR2 New Name";

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            let revisions = await session.advanced.revisions.getFor<Company>(company1Id);
            let revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(1);
            assertThat(revisions[0].name)
                .isEqualTo("HR1");

            revisions = await session.advanced.revisions.getFor<Company>(company2Id);
            revisionsCount = revisions.length;

            assertThat(revisionsCount)
                .isEqualTo(1);
            assertThat(revisions[0].name)
                .isEqualTo("HR2");

            // Assert that HasRevisions flag was created on both documents
            let company = await session.load<Company>(company1Id, Company);
            let metadata = session.advanced.getMetadataFor(company);
            assertThat(metadata["@flags"])
                .isEqualTo("HasRevisions");

            company = await session.load<Company>(company2Id);
            metadata = session.advanced.getMetadataFor(company);
            assertThat(metadata["@flags"])
                .isEqualTo("HasRevisions");
        }
    });
});
