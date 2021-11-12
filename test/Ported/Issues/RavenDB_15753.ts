import { IDocumentStore, IndexDefinition, PutIndexesOperation } from "../../../src";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil";
import { AdditionalAssembly } from "../../../src/Documents/Indexes/AdditionalAssembly";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

(RavenTestContext.isPullRequest ? describe.skip : describe)("RavenDB_15753", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("additionalAssemblies_Runtime", async () => {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "XmlIndex";
        indexDefinition.maps = new Set<string>();
        indexDefinition.maps.add("from c in docs.Companies select new { Name = typeof(System.Xml.XmlNode).Name }");

        indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromRuntime("System.Xml"));
        indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromRuntime("System.Xml.ReaderWriter"));
        indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromRuntime("System.Private.Xml"));

        await store.maintenance.send(new PutIndexesOperation(indexDefinition));
    });

    it("additionalAssemblies_Runtime_InvalidName", async () => {
        await assertThrows(async () => {
            const indexDefinition = new IndexDefinition();
            indexDefinition.name = "XmlIndex";
            indexDefinition.maps = new Set<string>();
            indexDefinition.maps.add("from c in docs.Companies select new { Name = typeof(System.Xml.XmlNode).Name }");

            indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromRuntime("Some.Assembly.That.Does.Not.Exist"));

            await store.maintenance.send(new PutIndexesOperation(indexDefinition));
        }, err => {
            assertThat(err.message)
                .contains("Cannot load assembly 'Some.Assembly.That.Does.Not.Exist'")
                .contains("Could not load file or assembly 'Some.Assembly.That.Does.Not.Exist");
        });
    });

    it("additionalAssemblies_NuGet", async () => {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "XmlIndex";
        indexDefinition.maps = new Set<string>();
        indexDefinition.maps.add("from c in docs.Companies select new { Name = typeof(System.Xml.XmlNode).Name }");

        indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromRuntime("System.Private.Xml"));
        indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromNuGet("System.Xml.ReaderWriter", "4.3.1"));

        await store.maintenance.send(new PutIndexesOperation(indexDefinition));
    });

    it("additionalAssemblies_NuGet_InvalidName", async () => {
        await assertThrows(async () => {
            const indexDefinition = new IndexDefinition();
            indexDefinition.name = "XmlIndex";
            indexDefinition.maps = new Set<string>();
            indexDefinition.maps.add("from c in docs.Companies select new { Name = typeof(System.Xml.XmlNode).Name }");

            indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromNuGet("Some.Assembly.That.Does.Not.Exist", "4.3.1"));

            await store.maintenance.send(new PutIndexesOperation(indexDefinition));
        }, err => {
            assertThat(err.message)
                .contains("Cannot load NuGet package 'Some.Assembly.That.Does.Not.Exist'")
                .contains("NuGet package 'Some.Assembly.That.Does.Not.Exist' version '4.3.1' from 'https://api.nuget.org/v3/index.json' does not exist");
        });
    });

    it("additionalAssemblies_NuGet_InvalidSource", async () => {
        await assertThrows(async () => {
            const indexDefinition = new IndexDefinition();
            indexDefinition.name = "XmlIndex";
            indexDefinition.maps = new Set<string>();
            indexDefinition.maps.add("from c in docs.Companies select new { Name = typeof(System.Xml.XmlNode).Name }");

            indexDefinition.additionalAssemblies.push(AdditionalAssembly.fromNuGet("System.Xml.ReaderWriter", "4.3.1", "http://some.url.that.does.not.exist.com"));

            await store.maintenance.send(new PutIndexesOperation(indexDefinition));
        }, err => {
            assertThat(err.message)
                .contains("Cannot load NuGet package 'System.Xml.ReaderWriter' version '4.3.1' from 'http://some.url.that.does.not.exist.com'")
                .contains("Unable to load the service index for source");
        });
    });
});