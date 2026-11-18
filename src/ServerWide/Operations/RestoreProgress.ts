import { SmugglerProgress } from "../../Documents/Smuggler/SmugglerResult.js";
import { RestoreResult } from "./RestoreResult.js";

export type RestoreProgress = SmugglerProgress & Pick<RestoreResult, "snapshotRestore" | "files">;
