import { EtlConfiguration } from "../EtlConfiguration";
import { SqlConnectionString } from "../../../..";
import { SqlEtlTable } from "./SqlEtlTable";

export interface SqlEtlConfiguration extends EtlConfiguration<SqlConnectionString> {
    parameterizeDeletes: boolean;
    forceQueryRecompile: boolean;
    quoteTables: boolean;
    commandTimeout: number;
    sqlTables: SqlEtlTable[];
}