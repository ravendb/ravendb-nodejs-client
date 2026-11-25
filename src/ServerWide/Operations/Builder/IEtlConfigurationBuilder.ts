import { RavenEtlConfiguration } from "../../../Documents/Operations/Etl/RavenEtlConfiguration.js";
import { SqlEtlConfiguration } from "../../../Documents/Operations/Etl/Sql/SqlEtlConfiguration.js";
import {
    ElasticSearchEtlConfiguration
} from "../../../Documents/Operations/Etl/ElasticSearch/ElasticSearchEtlConfiguration.js";
import { OlapEtlConfiguration } from "../../../Documents/Operations/Etl/Olap/OlapEtlConfiguration.js";
import { QueueEtlConfiguration } from "../../../Documents/Operations/Etl/Queue/QueueEtlConfiguration.js";
import { SnowflakeEtlConfiguration } from "../../../Documents/Operations/Etl/Snowflake/SnowflakeEtlConfiguration.js";
import { EmbeddingsGenerationConfiguration } from "../../../Documents/Operations/AI/EmbeddingsGenerationConfiguration.js";

export interface IEtlConfigurationBuilder {
    addRavenEtl(configuration: RavenEtlConfiguration): this;
    addSqlEtl(configuration: SqlEtlConfiguration): this;
    addElasticSearchEtl(configuration: ElasticSearchEtlConfiguration): this;
    addOlapEtl(configuration: OlapEtlConfiguration): this;
    addQueueEtl(configuration: QueueEtlConfiguration): this;
    addSnowflakeEtl(configuration: SnowflakeEtlConfiguration): this;
    addEmbeddingsGeneration(configuration: EmbeddingsGenerationConfiguration): this;
}
