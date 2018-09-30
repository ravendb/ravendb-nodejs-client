import {DocumentConventions} from "../Conventions/DocumentConventions";
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
     * @param entity Entity to get id from
     * @param idCallback output parameter which holds document id
     * @return true if id was read from entity
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

    public getOrGenerateDocumentId(entity: object): Promise<string> {
        let id;
        this.tryGetIdFromInstance(entity, (idVal) => id = idVal);
        return Promise.resolve()
        .then(() => {
            // Generate the key up front
            return id || this._generateId(entity);
        })
        // tslint:disable-next-line:no-shadowed-variable
        .then(id => {
            if (id && id.startsWith("/")) {
                throwError(
                    "InvalidOperationException",
                    "Cannot use value '" + id + "' as a document id because it begins with a '/'");
            }

            return id;
        });
    }

    public generateDocumentKeyForStorage(entity: object): Promise<string> {
        return Promise.resolve()
            .then(() => this.getOrGenerateDocumentId(entity))
            .then(id => {
                this.trySetIdentity(entity, id);
                return id;
            });
    }

    /**
     * Tries to set the identity property
     * @param entity Entity
     * @param id Id to set
     */
    public trySetIdentity(entity: object, id: string): void {
        const docType: DocumentType = TypeUtil.findType(entity, this._conventions.knownEntityTypes);
        const identityProperty = this._conventions.getIdentityProperty(docType);

        if (!identityProperty) {
            return;
        }

        entity[identityProperty] = id;
    }
}
