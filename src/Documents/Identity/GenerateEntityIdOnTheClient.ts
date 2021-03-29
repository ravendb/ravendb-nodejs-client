import { DocumentConventions } from "../Conventions/DocumentConventions";
import { DocumentType } from "../DocumentAbstractions";
import { throwError } from "../../Exceptions";
import { TypeUtil } from "../../Utility/TypeUtil";

export class GenerateEntityIdOnTheClient {

    private _conventions: DocumentConventions;
    private _generateId: (obj: object) => Promise<string>;

    public constructor(conventions: DocumentConventions, generateId: (obj: object) => Promise<string>) {
        this._conventions = conventions;
        this._generateId = generateId;
    }

    private _getIdentityProperty(entityType: DocumentType): string {
        return this._conventions.getIdentityProperty(entityType);
    }

    /**
     * Attempts to get the document key from an instance
     */
    public tryGetIdFromInstance(entity: object, idCallback?: (id: string) => void): boolean {
        if (!entity) {
            throwError("InvalidArgumentException", "Entity cannot be null or undefined.");
        }

        const resultCallback = (result: string) => {
            if (idCallback) {
                idCallback(result);
            }
        };

        try {
            const docType = TypeUtil.findType(entity, this._conventions.knownEntityTypes);
            const identityProperty = this._getIdentityProperty(docType);
            if (identityProperty) {
                const value = entity[identityProperty];
                if (typeof(value) === "string") {
                    resultCallback(value);
                    return true;
                }
            }
            resultCallback(null);
            return false;
        } catch (e) {
            throwError("InvalidOperationException", "Error trying to get ID from instance.");
        }
    }

    public async getOrGenerateDocumentId(entity: object): Promise<string> {
        let id;
        this.tryGetIdFromInstance(entity, (idVal) => id = idVal);

        // Generate the key up front
        if (!id) {
            id = await this._generateId(entity);
        }

        if (id && id.startsWith("/")) {
            throwError(
                "InvalidOperationException",
                "Cannot use value '" + id + "' as a document id because it begins with a '/'");
        }

        return id;
    }

    public async generateDocumentKeyForStorage(entity: object): Promise<string> {
        const id = await this.getOrGenerateDocumentId(entity);
        this.trySetIdentity(entity, id);
        return id;
    }

    /**
     * Tries to set the identity property
     */
    public trySetIdentity(entity: object, id: string, isProjection: boolean = false): void {
        const docType: DocumentType = TypeUtil.findType(entity, this._conventions.knownEntityTypes);
        const identityProperty = this._conventions.getIdentityProperty(docType);

        if (!identityProperty) {
            return;
        }

        if (isProjection && entity[identityProperty]) {
            // identity property was already set
            return;
        }

        entity[identityProperty] = id;
    }
}
