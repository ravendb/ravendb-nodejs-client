import {
    ElasticSearchConnectionString,
    OlapConnectionString, QueueConnectionString,
    RavenConnectionString,
    SnowflakeConnectionString,
    SqlConnectionString
} from "../../../Documents/Operations/Etl/ConnectionString.js";
import { AiConnectionString } from "../../../Documents/Operations/AI/ConnectionStrings/AiConnectionString.js";

export interface IConnectionStringConfigurationBuilder {
    addRavenConnectionString(connectionString: RavenConnectionString): this;
    addSqlConnectionString(connectionString: SqlConnectionString): this;
    addOlapConnectionString(connectionString: OlapConnectionString): this;
    addElasticSearchConnectionString(connectionString: ElasticSearchConnectionString): this;
    addQueueConnectionString(connectionString: QueueConnectionString): this;
    addSnowflakeConnectionString(connectionString: SnowflakeConnectionString): this;
    addAiConnectionString(connectionString: AiConnectionString): this;
}
