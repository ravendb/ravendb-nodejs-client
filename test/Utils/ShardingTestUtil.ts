import { DatabaseRecordBuilder, DocumentStore, PrefixedShardingSetting } from "../../src/index.js";
import { testContext } from "./TestUtil.js";

export async function getShardedDocumentStore(prefixed: PrefixedShardingSetting[] = []): Promise<DocumentStore> {
    testContext.customizeDbRecord = record => {
        record.sharding = DatabaseRecordBuilder.create()
            .sharded(record.databaseName, b => b
                .addShard(0, s => s.addNode("A"))
                .addShard(1, s => s.addNode("A"))
                .addShard(2, s => s.addNode("A")))
            .toDatabaseRecord()
            .sharding;
        record.sharding.prefixed = prefixed;
    };
    try {
        return await testContext.getDocumentStore();
    } finally {
        testContext.customizeDbRecord = null;
    }
}
