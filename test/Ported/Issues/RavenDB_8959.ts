import {
    DocumentStore,
    HiloIdGenerator,
    IDocumentStore,
    MultiDatabaseHiLoIdGenerator,
    MultiTypeHiLoIdGenerator
} from "../../../src/index.js";
import { NextId } from "../../../src/Documents/Identity/NextId.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class SingleNodeHiLoIdGenerator extends HiloIdGenerator {
    protected _getDocumentIdFromId(nextId: NextId) {
        return this._prefix + nextId.id;
    }
}

class SingleNodeMultiTypeHiLoIdGenerator extends MultiTypeHiLoIdGenerator {
    protected _createGeneratorFor(tag: string): HiloIdGenerator {
        return new SingleNodeHiLoIdGenerator(tag, this._store, this._dbName, this._conventions.identityPartsSeparator);
    }
}

class SingleNodeMultiDatabaseHiLoIdGenerator extends MultiDatabaseHiLoIdGenerator {
    private readonly _singleNodeGenerators = new Map<string, MultiTypeHiLoIdGenerator>();

    protected _getGeneratorForDatabase(database: string): MultiTypeHiLoIdGenerator {
        if (!this._singleNodeGenerators.has(database)) {
            this._singleNodeGenerators.set(database, new SingleNodeMultiTypeHiLoIdGenerator(this._store, database));
        }

        return this._singleNodeGenerators.get(database);
    }
}

describe("RavenDB_8959", function () {
    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    it("can customize hilo generation", async () => {
        testContext.customizeStore = async (documentStore: DocumentStore) => {
            const gen = new SingleNodeMultiDatabaseHiLoIdGenerator(documentStore);
            documentStore.conventions.documentIdGenerator = (database, entity) => gen.generateDocumentId(database, entity);
        };
        store = await testContext.getDocumentStore();
        testContext.customizeStore = null;

        const session = store.openSession();
        const entity = new User();
        await session.store(entity);
        assertThat(entity.id).isEqualTo("users/1");
    });
});
