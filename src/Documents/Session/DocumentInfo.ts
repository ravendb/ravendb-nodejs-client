import { ConcurrencyCheckMode, } from "./IDocumentSession";
import { IMetadataDictionary } from "./IMetadataDictionary";
import { IRavenObject } from "../../Types/IRavenObject";
import { CONSTANTS } from "../../Constants";
import { throwError } from "../../Exceptions";
import { TypeUtil } from "../../Utility/TypeUtil";
import { MetadataObject } from "./MetadataObject";

export class DocumentInfo {

    public id: string;

    public changeVector: string;

    public concurrencyCheckMode: ConcurrencyCheckMode;

    public ignoreChanges: boolean;

    public metadata: MetadataObject;
    public document: IRavenObject;

    public metadataInstance: IMetadataDictionary;

    public entity: object;
    public newDocument: boolean;
    public collection: string;

    public static getNewDocumentInfo(document: object): DocumentInfo {
        const metadata: object = document[CONSTANTS.Documents.Metadata.KEY];
        if (!metadata) {
            throwError("InvalidOperationException", "Document must have a metadata");
        }

        const id: string = metadata[CONSTANTS.Documents.Metadata.ID];
        if (TypeUtil.isNullOrUndefined(id) || typeof id !== "string") {
            throwError("InvalidOperationException", "Document must have an id");
        }

        const changeVector: string = metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
        if (TypeUtil.isNullOrUndefined(changeVector) || typeof changeVector !== "string") {
            throwError("InvalidOperationException", "Document must have an changeVector");
        }

        const newDocumentInfo = new DocumentInfo();
        newDocumentInfo.id = id;
        newDocumentInfo.document = document;
        newDocumentInfo.metadata = metadata;
        newDocumentInfo.entity = null;
        newDocumentInfo.changeVector = changeVector;
        return newDocumentInfo;
    }
}
