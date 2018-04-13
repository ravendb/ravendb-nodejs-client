import { InMemoryDocumentSessionOperations } from './InMemoryDocumentSessionOperations';
import { DocumentInfo } from './DocumentInfo';
import { TypeUtil } from '../../Utility/TypeUtil';
import { DocumentTypeHelper } from '../DocumenTypeHelper';
import { DocumentConventions } from '../Conventions/DocumentConventions';
import { CONSTANTS } from '../../Constants';
import { DocumentType } from "../DocumentAbstractions";
import { JsonSerializer } from '../../Mapping/Json';
import { TypesAwareObjectMapper, TypeInfo } from '../../Mapping/ObjectMapper';
import { Mapping } from '../../Mapping';
import { ObjectTypeDescriptor } from '../..';
import { throwError } from '../../Exceptions';

export class EntityToJson {

    private _session: InMemoryDocumentSessionOperations;
    private _jsonParser: JsonSerializer;
    /**
     * All the listeners for this session
     * @param _session Session to use
     */
    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = this._session;
    }

    private _missingDictionary: Map<object, Map<string, object>> = new Map();

    public get missingDictionary() {
        return this._missingDictionary;
    }

    public convertEntityToJson(entity: object, documentInfo: DocumentInfo): string {
        const { conventions } = this._session;
        const entityMapper = conventions.entityObjectMapper;
        
        let typeInfo: TypeInfo;
        const jsonNode = entityMapper.toObjectLiteral(entity, (_typeInfo) => {
            typeInfo = _typeInfo;
        });

        EntityToJson._writeMetadata(jsonNode, typeInfo, documentInfo);

        const type = DocumentTypeHelper.getType(entity, conventions);

        EntityToJson._tryRemoveIdentityProperty(jsonNode, type, conventions);

        // TBD: TrySimplifyJson(reader);

        return conventions.entitySerializer.serialize(entity);
    }

    public static convertEntityToJson(
        entity: object, conventions: DocumentConventions): object;
    public static convertEntityToJson(
        entity: object, conventions: DocumentConventions, documentInfo?: DocumentInfo): object {

        let typeInfo: TypeInfo;
        const jsonNode = Mapping.getDefaultEntityMapper().toObjectLiteral(entity, (_typeInfo) => {
            typeInfo = _typeInfo;
        });

        EntityToJson._writeMetadata(jsonNode, typeInfo, documentInfo);

        EntityToJson._tryRemoveIdentityProperty(jsonNode, typeInfo.typeName, conventions);
        //TBD: TrySimplifyJson(reader);

        return jsonNode;
    }

    private static _writeMetadata(jsonNode: object, typeInfo: TypeInfo, documentInfo: DocumentInfo): void {
        if (!documentInfo) {
            return;
        }

        documentInfo.metadata[CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES] = 
            typeInfo.nestedTypes;
        documentInfo.metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] =
            typeInfo.typeName;

        let setMetadata: boolean = false;
        const metadataNode: object = {};

        if (documentInfo.metadata 
            && Object.keys(documentInfo.metadata).length > 0) {
            setMetadata = true;
            Object.assign(metadataNode, documentInfo.metadata);
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
     * @param targetEntityType Class of entity
     * @param id Id of entity
     * @param document Raw entity
     * @return Entity instance
     */
    public convertToEntity(targetEntityType: DocumentType, id: string, document: object): object {
        const { conventions } = this._session;

        const entityType: ObjectTypeDescriptor = conventions.findKnownType(targetEntityType);
        try {
            if (TypeUtil.isType(document, targetEntityType)) {
                return document;
            }

            let entity;
            const documentTypeFromConventions = conventions.getJsType(id, document);

            if (documentTypeFromConventions) {
                if (entityType === documentTypeFromConventions) {
                    entity = this._session.conventions.entityObjectMapper.fromObjectLiteral(document);
                }
            }

            if (!id) {
                this._session.generateEntityIdOnTheClient.trySetIdentity(entity, id);
            }

            return entity;
        } catch (err) {
            throwError("InvalidOperationException", 
                `Could not convert document ${id} to entity of type ${entityType.name}.`);
        }
    }

    //TBD public static object ConvertToEntity(Type entityType, string id, BlittableJsonReaderObject document, DocumentConventions conventions)

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
