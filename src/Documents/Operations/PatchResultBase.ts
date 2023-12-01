import { PatchStatus } from "./PatchStatus";


export class PatchResultBase {
    public status: PatchStatus;
    public modifiedDocument: object;
    public lastModified: Date;
    public changeVector: string;
    public collection: string;
}
