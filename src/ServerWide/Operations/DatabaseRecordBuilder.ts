import { IDatabaseRecordBuilderInitializer } from "./Builder/IDatabaseRecordBuilderInitializer.js";
import { IDatabaseRecordBuilder } from "./Builder/IDatabaseRecordBuilder.js";
import { IEtlConfigurationBuilder } from "./Builder/IEtlConfigurationBuilder.js";
import { IConnectionStringConfigurationBuilder } from "./Builder/IConnectionStringConfigurationBuilder.js";
import { IBackupConfigurationBuilder } from "./Builder/IBackupConfigurationBuilder.js";
import { IIntegrationConfigurationBuilder } from "./Builder/IIntegrationConfigurationBuilder.js";
import { IReplicationConfigurationBuilder } from "./Builder/IReplicationConfigurationBuilder.js";
import { IShardedDatabaseRecordBuilder } from "./Builder/IShardedDatabaseRecordBuilder.js";
import { IShardedTopologyConfigurationBuilder } from "./Builder/IShardedTopologyConfigurationBuilder.js";
import { DatabaseTopology } from "./index.js";
import { DatabaseLockMode, DatabaseRecord } from "../index.js";
import { PeriodicBackupConfiguration } from "../../Documents/Operations/Backups/PeriodicBackupConfiguration.js";
import {
    ElasticSearchConnectionString,
    OlapConnectionString, QueueConnectionString,
    RavenConnectionString,
    SqlConnectionString
} from "../../Documents/Operations/Etl/ConnectionString.js";
import { RavenEtlConfiguration } from "../../Documents/Operations/Etl/RavenEtlConfiguration.js";
import { SqlEtlConfiguration } from "../../Documents/Operations/Etl/Sql/SqlEtlConfiguration.js";
import {
    ElasticSearchEtlConfiguration
} from "../../Documents/Operations/Etl/ElasticSearch/ElasticSearchEtlConfiguration.js";
import { OlapEtlConfiguration } from "../../Documents/Operations/Etl/Olap/OlapEtlConfiguration.js";
import { QueueEtlConfiguration } from "../../Documents/Operations/Etl/Queue/QueueEtlConfiguration.js";
import { PostgreSqlConfiguration } from "./Integrations/PostgreSql/PostgreSqlConfiguration.js";
import { ExternalReplication } from "../../Documents/Replication/ExternalReplication.js";
import { PullReplicationAsSink } from "../../Documents/Operations/Replication/PullReplicationAsSink.js";
import { PullReplicationDefinition } from "../../Documents/Operations/Replication/PullReplicationDefinition.js";
import { DocumentsCompressionConfiguration } from "../DocumentsCompressionConfiguration.js";
import { SorterDefinition } from "../../Documents/Queries/Sorting/SorterDefinition.js";
import { AnalyzerDefinition } from "../../Documents/Indexes/Analysis/AnalyzerDefinition.js";
import { IndexDefinition } from "../../Documents/Indexes/IndexDefinition.js";
import { RevisionsConfiguration } from "../../Documents/Operations/RevisionsConfiguration.js";
import { ClientConfiguration } from "../../Documents/Operations/Configuration/ClientConfiguration.js";
import { StudioConfiguration } from "../../Documents/Operations/Configuration/StudioConfiguration.js";
import { RefreshConfiguration } from "../../Documents/Operations/Refresh/RefreshConfiguration.js";
import { ExpirationConfiguration } from "../../Documents/Operations/Expiration/ExpirationConfiguration.js";
import { TimeSeriesConfiguration } from "../../Documents/Operations/TimeSeries/TimeSeriesConfiguration.js";
import { OrchestratorTopology } from "../OrchestratorTopology.js";
import { IOrchestratorTopologyConfigurationBuilder } from "./Builder/IOrchestratorTopologyConfigurationBuilder.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { ShardingConfiguration } from "../Sharding/ShardingConfiguration.js";
import { IShardTopologyConfigurationBuilder } from "./Builder/IShardTopologyConfigurationBuilder.js";
import { ITopologyConfigurationBuilder } from "./Builder/ITopologyConfigurationBuilder.js";
import { AiConnectionString } from "../../Documents/Operations/AI/index.js";

export class DatabaseRecordBuilder implements IDatabaseRecordBuilderInitializer,
    IDatabaseRecordBuilder,
    IEtlConfigurationBuilder,
    IConnectionStringConfigurationBuilder,
    IBackupConfigurationBuilder,
    IIntegrationConfigurationBuilder,
    IReplicationConfigurationBuilder,
    IShardedDatabaseRecordBuilder,
    IShardedTopologyConfigurationBuilder {

    public static create(): IDatabaseRecordBuilderInitializer {
        return new DatabaseRecordBuilder();
    }

    private _shardTopology: DatabaseTopology;
    private readonly _databaseRecord: DatabaseRecord;


    constructor() {
        this._databaseRecord = {
            databaseName: undefined
        };
    }

    addPeriodicBackup(configuration: PeriodicBackupConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.periodicBackups ??= [];
        this._databaseRecord.periodicBackups.push(configuration);
        return this;
    }

    addRavenConnectionString(connectionString: RavenConnectionString): this {
        if (!connectionString) {
            throw new Error("ConnectionString cannot be null");
        }

        this._databaseRecord.ravenConnectionStrings ??= {};
        this._databaseRecord.ravenConnectionStrings[connectionString.name] = connectionString;
        return this;
    }

    addSqlConnectionString(connectionString: SqlConnectionString): this {
        if (!connectionString) {
            throw new Error("ConnectionString cannot be null");
        }

        this._databaseRecord.sqlConnectionStrings ??= {};
        this._databaseRecord.sqlConnectionStrings[connectionString.name] = connectionString;
        return this;
    }

    addOlapConnectionString(connectionString: OlapConnectionString): this {
        if (!connectionString) {
            throw new Error("ConnectionString cannot be null");
        }

        this._databaseRecord.olapConnectionStrings ??= {};
        this._databaseRecord.olapConnectionStrings[connectionString.name] = connectionString;
        return this;
    }

    addElasticSearchConnectionString(connectionString: ElasticSearchConnectionString): this {
        if (!connectionString) {
            throw new Error("ConnectionString cannot be null");
        }

        this._databaseRecord.elasticSearchConnectionStrings = {};
        this._databaseRecord.elasticSearchConnectionStrings[connectionString.name] = connectionString;
        return this;
    }

    addQueueConnectionString(connectionString: QueueConnectionString): this {
        if (!connectionString) {
            throw new Error("ConnectionString cannot be null");
        }

        this._databaseRecord.queueConnectionStrings ??= {};
        this._databaseRecord.queueConnectionStrings[connectionString.name] = connectionString;
        return this;
    }

    addAiConnectionString(connectionString: AiConnectionString): this {
        if (!connectionString) {
            throw new Error("ConnectionString cannot be null");
        }

        this._databaseRecord.aiConnectionStrings ??= {};
        this._databaseRecord.aiConnectionStrings[connectionString.name] = connectionString;
        return this;
    }

    regular(databaseName: string): IDatabaseRecordBuilder {
        this._withName(databaseName);
        return this;
    }

    sharded(databaseName: string, builder: (builder: IShardedTopologyConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }

        this._withName(databaseName);

        this._databaseRecord.sharding = {} as ShardingConfiguration;

        builder(this);

        if (!this._databaseRecord.sharding.shards || Object.keys(this._databaseRecord.sharding.shards).length === 0) {
            throw new Error("At least one shard is required. Use addShard to add a shard to the topology");
        }

        return this;
    }

    addRavenEtl(configuration: RavenEtlConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.ravenEtls ??= [];
        this._databaseRecord.ravenEtls.push(configuration);

        return this;
    }

    addSqlEtl(configuration: SqlEtlConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.sqlEtls ??= [];
        this._databaseRecord.sqlEtls.push(configuration);

        return this;
    }

    addElasticSearchEtl(configuration: ElasticSearchEtlConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.elasticSearchEtls ??= [];
        this._databaseRecord.elasticSearchEtls.push(configuration);

        return this;
    }

    addOlapEtl(configuration: OlapEtlConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.olapEtls ??= [];
        this._databaseRecord.olapEtls.push(configuration);

        return this;
    }

    addQueueEtl(configuration: QueueEtlConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.queueEtls ??= [];
        this._databaseRecord.queueEtls.push(configuration);

        return this;
    }

    configurePostgreSql(configuration: PostgreSqlConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.integrations ??= {
            postgreSql: null
        }
        this._databaseRecord.integrations.postgreSql = configuration;

        return this;
    }

    addExternalReplication(configuration: ExternalReplication): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.externalReplications ??= [];
        this._databaseRecord.externalReplications.push(configuration);

        return this;
    }

    addPullReplicationSink(configuration: PullReplicationAsSink): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.sinkPullReplications ??= [];
        this._databaseRecord.sinkPullReplications.push(configuration);
        return this;
    }

    addPullReplicationHub(configuration: PullReplicationDefinition): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.hubPullReplications ??= [];
        this._databaseRecord.hubPullReplications.push(configuration);

        return this;
    }

    encrypted(): this {
        this._databaseRecord.encrypted = true;
        return this;
    }

    withLockMode(lockMode: DatabaseLockMode): this {
        this._databaseRecord.lockMode = lockMode;
        return this;
    }

    configureDocumentsCompression(configuration: DocumentsCompressionConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.documentsCompression = configuration;
        return this;
    }

    withSorters(...sorterDefinitions: SorterDefinition[]): this {
        if (!sorterDefinitions || sorterDefinitions.length === 0) {
            return this;
        }

        this._databaseRecord.sorters ??= {};

        for (const sorterDefinition of sorterDefinitions) {
            this._databaseRecord.sorters[sorterDefinition.name] = sorterDefinition;
        }

        return this;
    }

    withAnalyzers(...analyzerDefinitions: AnalyzerDefinition[]): this {
        if (!analyzerDefinitions || analyzerDefinitions.length === 0) {
            return this;
        }

        this._databaseRecord.analyzers ??= {};

        for (const analyzerDefinition of analyzerDefinitions) {
            this._databaseRecord.analyzers[analyzerDefinition.name] = analyzerDefinition;
        }

        return this;
    }

    withIndexes(...indexDefinitions: IndexDefinition[]): this {
        if (!indexDefinitions || indexDefinitions.length === 0) {
            return this;
        }

        this._databaseRecord.indexes ??= {};

        for (const indexDefinition of indexDefinitions) {
            this._databaseRecord.indexes[indexDefinition.name] = indexDefinition;
        }

        return this;
    }

    withSettings(settings: Record<string, string>): this {
        if (!settings) {
            throw new Error("Settings cannot be null");
        }

        this._databaseRecord.settings = settings;
        return this;
    }

    configureRevisions(configuration: RevisionsConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }
        this._databaseRecord.revisions = configuration;
        return this;
    }

    withEtls(builder: (builder: IEtlConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }

        builder(this);
        return this;
    }

    withBackups(builder: (builder: IBackupConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }
        builder(this);
        return this;
    }

    withReplication(builder: (builder: IReplicationConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }
        builder(this);
        return this;
    }

    withConnectionStrings(builder: (builder: IConnectionStringConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }

        builder(this);
        return this;
    }

    configureClient(configuration: ClientConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }
        this._databaseRecord.client = configuration;
        return this;
    }

    configureStudio(configuration: StudioConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }
        this._databaseRecord.studio = configuration;
        return this;
    }

    configureRefresh(configuration: RefreshConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }
        this._databaseRecord.refresh = configuration;
        return this;
    }

    configureExpiration(configuration: ExpirationConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.expiration = configuration;
        return this;
    }

    configureTimeSeries(configuration: TimeSeriesConfiguration): this {
        if (!configuration) {
            throw new Error("Configuration cannot be null");
        }

        this._databaseRecord.timeSeries = configuration;
        return this;
    }

    withIntegrations(builder: (builder: IIntegrationConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }

        builder(this);
        return this;
    }

    toDatabaseRecord(): DatabaseRecord {
        return this._databaseRecord;
    }

    disabled(): this {
        this._databaseRecord.disabled = true;
        return this;
    }

    orchestrator(builder: (builder: IOrchestratorTopologyConfigurationBuilder) => void): this
    orchestrator(topology: OrchestratorTopology): this
    orchestrator(topologyOrBuilder: OrchestratorTopology | ((builder: IOrchestratorTopologyConfigurationBuilder) => void)): this {
        if (TypeUtil.isFunction(topologyOrBuilder)) {
            return this._orchestratorUsingBuilder(topologyOrBuilder);
        }
        return this._orchestratorUsingTopology(topologyOrBuilder);
    }

    private _orchestratorUsingTopology(topology: OrchestratorTopology): this {
        if (!topology) {
            throw new Error("Topology cannot be null");
        }

        this._databaseRecord.sharding.orchestrator ??= {
            topology: null
        };

        this._databaseRecord.sharding.orchestrator.topology = topology;

        return this;
    }

    private _orchestratorUsingBuilder(builder: (builder: IOrchestratorTopologyConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }

        builder(new this.orchestratorTopologyConfigurationBuilder(this));

        return this;
    }

    private orchestratorTopologyConfigurationBuilder = class OrchestratorTopologyConfigurationBuilder implements IOrchestratorTopologyConfigurationBuilder {

        private readonly _builder: DatabaseRecordBuilder;

        constructor(builder: DatabaseRecordBuilder) {
            this._builder = builder;
        }

        addNode(nodeTag: string): IOrchestratorTopologyConfigurationBuilder {
            if (!nodeTag) {
                throw new Error("NodeTag cannot be null");
            }

            this._builder._databaseRecord.sharding.orchestrator ??= {
                topology: null
            };
            this._builder._databaseRecord.sharding.orchestrator.topology ??= {
                members: [],
                promotables: [],
                rehabs: []
            } as OrchestratorTopology;

            this._builder._databaseRecord.sharding.orchestrator.topology.members.push(nodeTag);

            return this;

        }

        enableDynamicNodesDistribution(): IOrchestratorTopologyConfigurationBuilder {
            this._builder._databaseRecord.sharding.orchestrator ??= {
                topology: null
            };

            this._builder._databaseRecord.sharding.orchestrator.topology ??= {
                members: [],
                rehabs: [],
                promotables: []
            } as OrchestratorTopology;

            this._builder._databaseRecord.sharding.orchestrator.topology.dynamicNodesDistribution = true;
            return this;
        }
    }

    addShard(shardNumber: number, builder: (builder: IShardTopologyConfigurationBuilder) => void): this;
    addShard(shardNumber: number, topology: DatabaseTopology): this
    addShard(shardNumber: number, topologyOrBuilder: DatabaseTopology | ((builder: IShardTopologyConfigurationBuilder) => void)): this {
        if (TypeUtil.isFunction(topologyOrBuilder)) {
            return this._addShardUsingBuilder(shardNumber, topologyOrBuilder);
        }

        return this._addShardUsingTopology(shardNumber, topologyOrBuilder);
    }

    private _addShardUsingTopology(shardNumber: number, topology: DatabaseTopology): this {
        if (!topology) {
            throw new Error("Topology cannot be null");
        }

        this._databaseRecord.sharding.shards ??= { };

        this._databaseRecord.sharding.shards[shardNumber] = topology;
        return this;
    }

    private _addShardUsingBuilder(shardNumber: number, builder: (builder: IShardTopologyConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }

        this._shardTopology = {
            members: [],
            rehabs: [],
            promotables: []
        } as DatabaseTopology;
        try {
            builder(new this._shardTopologyConfigurationBuilder(this));

            this._databaseRecord.sharding.shards ??= {};

            this._databaseRecord.sharding.shards[shardNumber] = this._shardTopology;
        } finally {
            this._shardTopology = null;
        }

        return this;
    }

    private _shardTopologyConfigurationBuilder = class ShardTopologyConfigurationBuilder implements IShardTopologyConfigurationBuilder {
        private readonly _builder: DatabaseRecordBuilder;

        constructor(builder: DatabaseRecordBuilder) {
            this._builder = builder;
        }

        addNode(nodeTag: string): IShardTopologyConfigurationBuilder {
            if (!nodeTag) {
                throw new Error("NodeTag cannot be null");
            }

            this._builder._shardTopology.members.push(nodeTag);
            return this;
        }

        enableDynamicNodesDistribution(): IShardTopologyConfigurationBuilder {
            this._builder._shardTopology.dynamicNodesDistribution = true;
            return this;
        }
    }

    withTopology(topology: DatabaseTopology): this
    withTopology(builder: (builder: ITopologyConfigurationBuilder) => void): this;
    withTopology(builderOrTopology: DatabaseTopology | ((builder: ITopologyConfigurationBuilder) => void)): this {
        if (TypeUtil.isFunction(builderOrTopology)) {
            return this._withTopologyUsingBuilder(builderOrTopology);
        }
        return this._withTopologyUsingTopology(builderOrTopology);
    }

    private _withTopologyUsingTopology(topology: DatabaseTopology): this {
        if (!topology) {
            throw new Error("Topology cannot be null");
        }

        this._databaseRecord.topology = topology;
        return this;
    }

    private _withTopologyUsingBuilder(builder: (builder: ITopologyConfigurationBuilder) => void): this {
        if (!builder) {
            throw new Error("Builder cannot be null");
        }

        builder(new this._topologyConfigurationBuilder(this));
        return this;
    }

    private _topologyConfigurationBuilder = class TopologyConfigurationBuilder implements ITopologyConfigurationBuilder {
        private readonly _builder: DatabaseRecordBuilder;

        constructor(builder: DatabaseRecordBuilder) {
            this._builder = builder;
        }

        addNode(nodeTag: string): ITopologyConfigurationBuilder {
            this._builder._databaseRecord.topology ??= {
                members: [],
                rehabs: [],
                promotables: []
            } as DatabaseTopology;

            this._builder._databaseRecord.topology.members.push(nodeTag);
            return this;
        }

        enableDynamicNodesDistribution(): ITopologyConfigurationBuilder {
            this._builder._databaseRecord.sharding.orchestrator ??= {
                topology: null
            };

            this._builder._databaseRecord.sharding.orchestrator.topology ??= {
                members: [],
                promotables: [],
                rehabs: []
            } as OrchestratorTopology;

            this._builder._databaseRecord.sharding.orchestrator.topology.dynamicNodesDistribution = true;
            return this;
        }
    }

    withReplicationFactor(replicationFactor: number): this {
        this._databaseRecord.topology ??= {
            members: [],
            rehabs: [],
            promotables: []
        } as DatabaseTopology;
        this._databaseRecord.topology.replicationFactor = replicationFactor;

        return this;
    }

    private _withName(databaseName: string) {
        this._databaseRecord.databaseName = databaseName;
    }

}
