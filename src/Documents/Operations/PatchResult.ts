import { PatchStatus } from "./PatchStatus";

export class PatchResult {

    public status: PatchStatus;
    public modifiedDocument: object;
    public originalDocument: object;
    public debug: object;

    public changeVector: string;
    public collection: string;
}
