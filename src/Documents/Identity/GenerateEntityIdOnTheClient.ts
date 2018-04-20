import {DocumentConventions} from "../Conventions/DocumentConventions";
import { DocumentType, EntityConstructor } from "../DocumentAbstractions";
import { throwError } from "../../Exceptions";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentTypeHelper } from "../DocumenTypeHelper";
export class GenerateEntityIdOnTheClient {

    private _conventions: DocumentConventions;
    private _generateId: (obj: object) => string;

    public constructor(conventions: DocumentConventions, generateId: (obj: object) => string) {
        this._conventions = conventions;
        this._generateId = generateId;
    }

    private _getIdentityProperty(entityType: DocumentType): string {
        return this._conventions.getIdentityProperty(entityType);
    }

    /**
     * Attempts to get the document key from an instance
     * @param entity Entity to get id from
     * @param idHolder output parameter which holds document id
     * @return true if id was read from entity
     */
    public tryGetIdFromInstance(entity: object, idCallback: (id: string) => void): boolean {
        if (!entity) {
            throwError("InvalidArgumentException", "Entity cannot be null or undefined.");
        }

        try {
            const docType: DocumentType = TypeUtil.findType(entity, this._conventions.knownEntityTypes);
            const identityProperty = this._getIdentityProperty(docType);
            if (identityProperty) {
                const value = entity[identityProperty];
                if (typeof(value) === "string") {
                    idCallback(value);
                    return true;
                }
            }
            idCallback(null);
            return false;
        } catch (e) {
            throwError("InvalidOperationException", "Error trying to get ID from instance.");
        }
    }

    public getOrGenerateDocumentId(entity: object): string {
        let id;
        this.tryGetIdFromInstance(entity, (idVal) => id = idVal);
        if (!id) {
            // Generate the key up front
            id = this._generateId(entity);
        }

        if (id && id.startsWith("/")) {
            throwError(
                "InvalidOperationException", 
                "Cannot use value '" + id + "' as a document id because it begins with a '/'");
        }

        return id;
    }

    public generateDocumentKeyForStorage(entity: object) {
        const id = this.getOrGenerateDocumentId(entity);
        this.trySetIdentity(entity, id);
        return id;
    }

    /**
     * Tries to set the identity property
     * @param entity Entity
     * @param id Id to set
     */
    public trySetIdentity(entity: object, id: string): void {
        const docType: DocumentType = TypeUtil.findType(entity, this._conventions.knownEntityTypes);
        const identityProperty = this._conventions.getIdentityProperty(docType);

        if (identityProperty) {
            return;
        }

        entity[identityProperty] = id;
    }
}
