import {InMemoryDocumentSessionOperations} from "./InMemoryDocumentSessionOperations";
import {DocumentInfo} from "./DocumentInfo";
import {TypeUtil} from "../../Utility/TypeUtil";
import {DocumentConventions} from "../Conventions/DocumentConventions";
import {CONSTANTS} from "../../Constants";
import {DocumentType} from "../DocumentAbstractions";
import {TypeInfo} from "../../Mapping/ObjectMapper";
import {Mapping} from "../../Mapping";
import {ObjectTypeDescriptor} from "../..";
import {throwError} from "../../Exceptions";
import {SetupDocumentBase} from "../SetupDocumentBase";

export class EntityToJson {

    private readonly _session: InMemoryDocumentSessionOperations;

    /**
     * All the listeners for this session
     */
    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    private _missingDictionary: Map<object, Map<string, object>> = new Map();

    public get missingDictionary() {
        return this._missingDictionary;
    }

    public convertEntityToJson(entity: object, documentInfo: DocumentInfo): object {
        const {conventions} = this._session;
        const entityMapper = conventions.entityObjectMapper;

        let typeInfo: TypeInfo;
        let jsonNode = entityMapper.toObjectLiteral(entity, (_typeInfo) => {
            typeInfo = _typeInfo;
        }, conventions.knownEntityTypesByName);

        // TODO handle Maps
        if (entity instanceof SetupDocumentBase) {
            jsonNode = entity.toRemoteFieldNames();
        } else {
            jsonNode = conventions.transformObjectKeysToRemoteFieldNameConvention(jsonNode);
        }

        EntityToJson._writeMetadata(jsonNode, typeInfo, documentInfo);

        const type: DocumentType = TypeUtil.findType(entity, conventions.knownEntityTypes);

        EntityToJson._tryRemoveIdentityProperty(jsonNode, type, conventions);

        return jsonNode;
    }

    public static convertEntityToJson(
        entity: object, conventions: DocumentConventions): object;
    public static convertEntityToJson(
        entity: object, conventions: DocumentConventions, documentInfo: DocumentInfo): object;
    public static convertEntityToJson(
        entity: object, conventions: DocumentConventions, documentInfo?: DocumentInfo): object {

        let typeInfo: TypeInfo;
        const jsonNode = Mapping.getDefaultMapper().toObjectLiteral(entity, (_typeInfo) => {
            typeInfo = _typeInfo;
        });

        EntityToJson._writeMetadata(jsonNode, typeInfo, documentInfo);

        EntityToJson._tryRemoveIdentityProperty(jsonNode, typeInfo.typeName, conventions);

        return jsonNode;
    }

    private static _writeMetadata(jsonNode: object, typeInfo: TypeInfo, documentInfo: DocumentInfo): void {
        if (!documentInfo) {
            return;
        }

        if (documentInfo.metadata) {
            documentInfo.metadata[CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES] = typeInfo.nestedTypes;
            documentInfo.metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] = typeInfo.typeName;
        }

        if (documentInfo.metadataInstance) {
            documentInfo.metadataInstance[CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES] = typeInfo.nestedTypes;
            documentInfo.metadataInstance[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] = typeInfo.typeName;
        }

        let setMetadata: boolean = false;
        const metadataNode: object = {};

        if (documentInfo.metadata && Object.keys(documentInfo.metadata).length > 0) {
            setMetadata = true;
            Object.assign(metadataNode, documentInfo.metadata);

            // Add the document @metadata fields (for RDBC-213)
            const entityMeta = documentInfo.entity[CONSTANTS.Documents.Metadata.KEY];
            for (const metadataItem in entityMeta) {
                if (entityMeta.hasOwnProperty(metadataItem)) {
                    setMetadata = true;
                    metadataNode[metadataItem] = entityMeta[metadataItem];
                }
            }
        } else if (documentInfo.metadataInstance) {
            setMetadata = true;
            Object.assign(metadataNode, documentInfo.metadataInstance);
        }

        if (documentInfo.collection) {
            setMetadata = true;
            metadataNode[CONSTANTS.Documents.Metadata.COLLECTION] = documentInfo.collection;
        }

        if (setMetadata) {
            jsonNode[CONSTANTS.Documents.Metadata.KEY] = metadataNode;
        }
    }

    /**
     * Converts a json object to an entity.
     */
    public convertToEntity(targetEntityType: DocumentType, id: string, document: object): object {
        const conventions = this._session.conventions;

        const entityType: ObjectTypeDescriptor = conventions.findEntityType(targetEntityType);
        try {
            if (TypeUtil.isType(document, targetEntityType)) {
                return document;
            }

            let entity;
            const documentTypeFromConventions = conventions.getJsType(id, document);

            const entityTypeInfoFromMetadata = EntityToJson._getEntityTypeInfoFromMetadata(document);
            if (documentTypeFromConventions) {
                const passedEntityTypeIsAssignableFromConventionsDocType =
                    entityType
                    && ((entityType.name === documentTypeFromConventions.name)
                    || TypeUtil.isInstanceOf(entityType, documentTypeFromConventions));
                if (passedEntityTypeIsAssignableFromConventionsDocType) {
                    const mapper = conventions.entityObjectMapper;
                    entity = mapper.fromObjectLiteral(
                        document, entityTypeInfoFromMetadata);
                }
            }

            if (!entity) {
                const mapper = conventions.entityObjectMapper;
                let passedTypeInfo = entityTypeInfoFromMetadata;
                if (entityType) {
                    passedTypeInfo =
                        Object.assign(passedTypeInfo, {typeName: entityType.name});
                }

                entity = mapper.fromObjectLiteral(
                    document, passedTypeInfo);
            }

            if (id) {
                this._session.generateEntityIdOnTheClient.trySetIdentity(entity, id);
            }

            return entity;
        } catch (err) {
            throwError("InvalidOperationException",
                `Could not convert document ${id} to entity of type `
                + `${entityType ? entityType.name : entityType}: ${err.stack}`,
                err);
        }
    }

    private static _getEntityTypeInfoFromMetadata(document: object): TypeInfo {
        const metadata = document[CONSTANTS.Documents.Metadata.KEY];
        if (!metadata) {
            return {};
        }

        return {
            typeName: metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE],
            nestedTypes: metadata[CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES]
        };
    }

    private static _tryRemoveIdentityProperty(
        document: object, entityType: DocumentType, conventions: DocumentConventions): boolean {
        const identityProperty = conventions.getIdentityProperty(entityType);

        if (!identityProperty) {
            return false;
        }

        delete document[identityProperty];
        return true;
    }
}
