import { CONSTANTS } from "../../Constants";

export * from "./Replacers";
export * from "./Revivers";

export function tryGetConflict(metadata: object): boolean {
    return metadata[CONSTANTS.Documents.Metadata.CONFLICT] || false;
}