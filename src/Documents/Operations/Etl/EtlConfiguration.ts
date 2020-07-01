import { ConnectionString } from "../../..";
import { Transformation } from "./Transformation";

export interface EtlConfiguration<T extends ConnectionString> {
    taskId: number;
    name: string;
    mentorNode: string;
    connectionStringName: string;
    transforms: Transformation[];
    disabled: boolean;
    allowEtlOnNonEncryptedChannel: boolean;
}