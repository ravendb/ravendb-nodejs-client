import { EtlConfiguration } from "../EtlConfiguration";
import { DocumentConventions, EtlType, serializeSqlEtlTable, SqlConnectionString } from "../../../..";
import { SqlEtlTable } from "./SqlEtlTable";

export class SqlEtlConfiguration extends EtlConfiguration<SqlConnectionString> {
    public parameterizeDeletes: boolean;
    public forceQueryRecompile: boolean;
    public quoteTables: boolean;
    public commandTimeout: number;
    public sqlTables: SqlEtlTable[];

    public get etlType(): EtlType {
        return "Sql";
    }

    serialize(conventions: DocumentConventions): object {
        const result = super.serialize(conventions) as any;
        result.ParameterizeDeletes = this.parameterizeDeletes;
        result.ForceQueryRecompile = this.forceQueryRecompile;
        result.QuoteTables = this.quoteTables;
        result.CommandTimeout = this.commandTimeout;
        result.EtlType = this.etlType;
        result.SqlTables = this.sqlTables?.map(x => serializeSqlEtlTable(x))
        return result;
    }
}