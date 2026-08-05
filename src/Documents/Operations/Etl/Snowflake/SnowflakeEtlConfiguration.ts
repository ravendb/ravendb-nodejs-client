import { EtlConfiguration } from "../EtlConfiguration.js";
import { SnowflakeEtlTable, serializeSnowflakeEtlTable } from "./SnowflakeEtlTable.js";
import { SnowflakeConnectionString, EtlType } from "../ConnectionString.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";

export class SnowflakeEtlConfiguration extends EtlConfiguration<SnowflakeConnectionString> {
    public commandTimeout: number;
    public snowflakeTables: SnowflakeEtlTable[];

    public get etlType(): EtlType {
        return "Snowflake";
    }

    serialize(conventions: DocumentConventions): object {
        const result = super.serialize(conventions) as any;
        result.CommandTimeout = this.commandTimeout;
        result.EtlType = this.etlType;
        result.SnowflakeTables = this.snowflakeTables?.map(x => serializeSnowflakeEtlTable(x));
        return result;
    }
}
