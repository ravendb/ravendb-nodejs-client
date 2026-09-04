import { CdcColumnType } from "./CdcColumnType.js";

/**
 * Maps a single SQL column to a RavenDB document property or attachment.
 */
export interface CdcColumnMapping {
    /**
     * The SQL column name in the source table.
     */
    column: string;

    /**
     * The target name in RavenDB. For "Default" and "Json" types, this is the
     * document property name. For "Attachment" type, this is the attachment name.
     */
    name: string;

    /**
     * How this column is stored. "Default" stores as a document property with
     * standard type conversion. "Json" parses the value as a native JSON object
     * or array. "Attachment" stores the raw value as a RavenDB attachment.
     */
    type?: CdcColumnType;
}
