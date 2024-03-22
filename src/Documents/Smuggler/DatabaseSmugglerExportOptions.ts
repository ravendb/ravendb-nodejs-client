import { DatabaseSmugglerOptions } from "./DatabaseSmugglerOptions";
import { IDatabaseSmugglerExportOptions } from "./IDatabaseSmugglerExportOptions";
import { ExportCompressionAlgorithm } from "./ExportCompressionAlgorithm";

export class DatabaseSmugglerExportOptions extends DatabaseSmugglerOptions implements IDatabaseSmugglerExportOptions {
    compressionAlgorithm?: ExportCompressionAlgorithm;
}
