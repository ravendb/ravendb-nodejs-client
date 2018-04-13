import { ConcurrencyCheckMode, IMetadataDictionary } from "./IDocumentSession";
import { IRavenObject } from "../../Types/IRavenObject";

export class DocumentInfo {

    public id: string;

    public changeVector: string;

    public concurrencyCheckMode: ConcurrencyCheckMode;

    public ignoreChanges: boolean;

    public metadata: IRavenObject;
    public document: IRavenObject;

    public metadataInstance: IMetadataDictionary;

    public entity: object;
    public newDocument: boolean;
    public collection: string;
}
