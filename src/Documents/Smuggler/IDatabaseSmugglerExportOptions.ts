import { IDatabaseSmugglerOptions } from "./IDatabaseSmugglerOptions";
import { ExportCompressionAlgorithm } from "./ExportCompressionAlgorithm";

export interface IDatabaseSmugglerExportOptions extends IDatabaseSmugglerOptions {
    collections: string[];
    compressionAlgorithm?: ExportCompressionAlgorithm;
}