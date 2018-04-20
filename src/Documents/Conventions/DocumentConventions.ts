import { TypesAwareObjectMapper } from "../../Mapping/ObjectMapper";
import { JsonSerializer } from "../../Mapping/Json";
import { 
    DocumentType, 
} from "../DocumentAbstractions";
import { 
    Todo, 
    IRavenObject, 
    ObjectTypeDescriptor, 
    ObjectLiteralDescriptor, 
    EntityConstructor, 
    ClassConstructor 
} from "../../Types";
import * as pluralize from "pluralize";
import { ClientConfiguration } from "../Operations/Configuration/ClientConfiguration";
import { ReadBalanceBehavior } from "../../Http/ReadBalanceBehavior";
import { throwError } from "../../Exceptions";
import { CONSTANTS } from "../../Constants";
import { TypeUtil } from "../../Utility/TypeUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { DateUtil } from "../../Utility/DateUtil";

export type IdConvention = (databaseName: string, entity: object) => string;
export class DocumentConventions {

    private static _defaults: DocumentConventions = new DocumentConventions();

    public static get defaultConventions() {
        return this._defaults;
    }

    private static _cachedDefaultTypeCollectionNames: Map<ObjectTypeDescriptor, string> = new Map();

    // TBD: private readonly List<(Type Type, TryConvertValueForQueryDelegate<object> Convert)> 
    // _listOfQueryValueConverters = new List<(Type, TryConvertValueForQueryDelegate<object>)>();

    private _registeredIdConventions:
        Map<ObjectTypeDescriptor, IdConvention> = new Map();

    private _registeredIdPropertyNames:
        Map<ObjectTypeDescriptor, string> = new Map();

    private _frozen: boolean;
    private _originalConfiguration: ClientConfiguration;
    private _idPropertyCache: Map<ObjectTypeDescriptor, string> = new Map();
    // private _saveEnumsAsIntegers: number;
    private _identityPartsSeparator: string;
    private _disableTopologyUpdates: boolean;

    private _transformClassCollectionNameToDocumentIdPrefix: (maybeClassCollectionName: string) => string;
    private _documentIdGenerator: IdConvention;
    private _findIdentityPropertyNameFromCollectionName: (collectionName: string) => string;

    private _findCollectionName: (constructorOrTypeChecker: ObjectTypeDescriptor) => string;

    private _findJsTypeName: (ctorOrTypeChecker: ObjectTypeDescriptor) => string;
    private _findJsType: (id: string, doc: object) => ObjectTypeDescriptor;

    private _useOptimisticConcurrency: boolean;
    private _throwIfQueryPageSizeIsNotSet: boolean;
    private _maxNumberOfRequestsPerSession: number;

    private _readBalanceBehavior: ReadBalanceBehavior;
    private _maxHttpCacheSize: number;
    
    private _entityObjectMapper: TypesAwareObjectMapper;

    private _entityJsonSerializer: JsonSerializer;

    private _registeredTypeDescriptors: ObjectLiteralDescriptor[] = [];

    private _knownTypes: Map<string, ObjectTypeDescriptor> = new Map();

    private _entityMapper: TypesAwareObjectMapper;

    public get entityMapper() {
        if (!this._entityMapper) {
            this._entityMapper = new TypesAwareObjectMapper({
                dateFormat: DateUtil.DEFAULT_DATE_FORMAT,
                knownTypes: this._knownTypes
            });
        }

        return this._entityMapper;
    }

    public constructor() {
        this._readBalanceBehavior = "None";
        this._identityPartsSeparator = "/";
        this._findIdentityPropertyNameFromCollectionName = entityName => "id";
        this._findJsType = (id: string, doc: object) => {
            const metadata = doc[CONSTANTS.Documents.Metadata.KEY];
            if (metadata !== null) {
                const jsType = metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] as string;
                return this._knownTypes.get(jsType);

            }

            return null;
        };

        this._findJsTypeName = (ctorOrTypeChecker: ObjectTypeDescriptor) => {
            if ("isType" in (ctorOrTypeChecker as object)) {
                return (ctorOrTypeChecker as ObjectLiteralDescriptor).name;
            }

            return (ctorOrTypeChecker as ClassConstructor).name;
        };

        this._transformClassCollectionNameToDocumentIdPrefix =
            collectionName => DocumentConventions.defaultTransformCollectionNameToDocumentIdPrefix(collectionName);

        this._findCollectionName = type => DocumentConventions.defaultGetCollectionName(type);

        this._maxNumberOfRequestsPerSession = 30;
        this._maxHttpCacheSize = 128 * 1024 * 1024;

        this._entityObjectMapper = null as Todo as any;  // TODO;
    }

    public get entityObjectMapper(): TypesAwareObjectMapper {
        return this._entityObjectMapper;
    }

    public set entityObjectMapper(value: TypesAwareObjectMapper) {
        this._entityObjectMapper = value;
    }

    public get entitySerializer(): JsonSerializer {
        return this._entityJsonSerializer;
    }

    public set entitySerializer(value: JsonSerializer) {
        this._entityJsonSerializer = value;
    }

    public get readBalanceBehavior(): ReadBalanceBehavior {
        return this._readBalanceBehavior;
    }

    public set readBalanceBehavior(value: ReadBalanceBehavior) {
        this._readBalanceBehavior = value;
    }

    public deserializeEntityFromJson(documentType: ObjectTypeDescriptor, document: object): object {
        try {
            return this.entityObjectMapper.toObjectLiteral(document);
        } catch (err) {
            throwError("RavenException", "Cannot deserialize entity", err);
        }
    }

    public get maxNumberOfRequestsPerSession(): number {
        return this._maxNumberOfRequestsPerSession;
    }

    public set maxNumberOfRequestsPerSession(value: number) {
        this._maxNumberOfRequestsPerSession = value;
    }

    public get maxHttpCacheSize(): number {
        return this._maxHttpCacheSize;
    }

    public set maxHttpCacheSize(value: number) {
        this._maxHttpCacheSize = value;
    }

    /**
     * If set to 'true' then it will throw an exception when any query is performed (in session)
     * without explicit page size set.
     * This can be useful for development purposes to pinpoint all the possible performance bottlenecks
     * since from 4.0 there is no limitation for number of results returned from server.
     * @return true if should we throw if page size is not set
     */
    public isThrowIfQueryPageSizeIsNotSet(): boolean {
        return this._throwIfQueryPageSizeIsNotSet;
    }

    /**
     * If set to 'true' then it will throw an exception when any query is performed (in session)
     * without explicit page size set.
     * This can be useful for development purposes to pinpoint all the possible performance bottlenecks
     * since from 4.0 there is no limitation for number of results returned from server.
     * @param throwIfQueryPageSizeIsNotSet value to set
     */
    public setThrowIfQueryPageSizeIsNotSet(throwIfQueryPageSizeIsNotSet: boolean): void {
        this._assertNotFrozen();
        this._throwIfQueryPageSizeIsNotSet = throwIfQueryPageSizeIsNotSet;
    }

    /**
     * Whether UseOptimisticConcurrency is set to true by default for all opened sessions
     * @return true if optimistic concurrency is enabled
     */
    public isUseOptimisticConcurrency(): boolean {
        return this._useOptimisticConcurrency;
    }

    /**
     * Whether UseOptimisticConcurrency is set to true by default for all opened sessions
     * @param useOptimisticConcurrency value to set
     */
    public setUseOptimisticConcurrency(useOptimisticConcurrency: boolean): void {
        this._useOptimisticConcurrency = useOptimisticConcurrency;
    }

    public get findJsType() {
        return this._findJsType;
    }

    public set findJsType(value) {
        this._assertNotFrozen();
        this._findJsType = value;
    }

    public get findJsTypeName() {
        return this._findJsTypeName;
    }

    public set findJsTypeName(value) {
        this._assertNotFrozen();
        this._findJsTypeName = value;
    }

    public get findCollectionName() {
        return this._findCollectionName;
    }

    public set findCollectionName(value) {
        this._assertNotFrozen();
        this._findCollectionName = value;
    }

    public get findIdentityPropertyNameFromCollectionName() {
        return this._findIdentityPropertyNameFromCollectionName;
    }

    public set findIdentityPropertyNameFromCollectionName(value) {
        this._findIdentityPropertyNameFromCollectionName = value;
    }

    public get documentIdGenerator() {
        return this._documentIdGenerator;
    }

    public set documentIdGenerator(value) {
        this._assertNotFrozen();
        this._documentIdGenerator = value;
    }

    public get identityPartsSeparator(): string {
        return this._identityPartsSeparator;
    }

    public set identityPartsSeparator(value: string) {
        this._identityPartsSeparator = value;
    }

    public get isDisableTopologyUpdates(): boolean {
        return this._disableTopologyUpdates;
    }

    public set disableTopologyUpdates(value: boolean) {
        this._disableTopologyUpdates = value;
    }

    public get throwIfQueryPageSizeIsNotSet(): boolean {
        return this._throwIfQueryPageSizeIsNotSet;
    }

    public set throwIfQueryPageSizeIsNotSet(value: boolean) {
        this._assertNotFrozen();
        this._throwIfQueryPageSizeIsNotSet = value;
    }

    public get transformClassCollectionNameToDocumentIdPrefix() {
        return this._transformClassCollectionNameToDocumentIdPrefix;
    }

    public set transformClassCollectionNameToDocumentIdPrefix(value) {
        this._transformClassCollectionNameToDocumentIdPrefix = value;
    }

    /**
     *  Default method used when finding a collection name for a type
     *  @param clazz Class
     *  @return default collection name for class
     */
    public static defaultGetCollectionName(ctorOrTypeChecker: ObjectTypeDescriptor): string {
        let result = this._cachedDefaultTypeCollectionNames.get(ctorOrTypeChecker);
        if (result) {
            return result;
        }

        if (typeof (ctorOrTypeChecker) === "string") {
            result = pluralize.plural(ctorOrTypeChecker);
        } else {
            result = pluralize.plural(ctorOrTypeChecker.name);
        }

        this._cachedDefaultTypeCollectionNames.set(ctorOrTypeChecker, result);

        return result;
    }

    /**
     * Gets the collection name for a given type.
     * @param clazz Class
     * @return collection name
     */
    public getCollectionNameForType(ctorOrTypeChecker: ObjectTypeDescriptor): string {
        const collectionName: string = this._findCollectionName(ctorOrTypeChecker);
        return collectionName || DocumentConventions.defaultGetCollectionName(ctorOrTypeChecker);
    }

    /**
     * Gets the collection name for a given type.
     * @param entity entity to get collection name
     * @return collection name
     */
    public getCollectionNameForEntity(entity: Object): string {
        if (!entity) {
            return null;
        }

        return this.getCollectionNameForType(this._getEntityTypeDescriptor(entity));
    }

    private _getEntityTypeDescriptor(entity: Object): ObjectTypeDescriptor {
        if (TypeUtil.isClassConstructor(entity.constructor)) {
            return entity.constructor as ClassConstructor;
        }

        for (const checker of this._registeredTypeDescriptors) {
            if (checker.isType(entity)) {
                return checker;
            }
        }

        return null;
    }

    /**
     * Generates the document id.
     * @param database Database name
     * @param entity Entity
     * @return document id
     */
    public generateDocumentId(database: string, entity: Object): string {
        const entityTypeDescriptor: ObjectTypeDescriptor = this._getEntityTypeDescriptor(entity);

        for (const [typeDescriptor, idConvention] of this._registeredIdConventions) {
            if (TypeUtil.isType(entity, typeDescriptor)) {
                return idConvention(database, entity);
            }
        }

        return this._documentIdGenerator(database, entity);
    }

    /**
     * Register an id convention for a single type.
     * Note that you can still fall back to the DocumentIdGenerator if you want.
     * @return document conventions
     */
    public registerIdConvention<TEntity>(
        ctorOrTypeChecker: ObjectTypeDescriptor,
        idConvention: IdConvention): DocumentConventions {
        this._assertNotFrozen();

        this._registeredIdConventions.set(ctorOrTypeChecker, idConvention);

        return this;
    }

    public registerEntityTypeChecker(typeChecker: ObjectLiteralDescriptor) {
        this._registeredTypeDescriptors.push(typeChecker);
    }

    public registerEntityPropertyName(ctorOrTypeChecker: ObjectTypeDescriptor, idProperty: string) {
        this._registeredIdPropertyNames.set(ctorOrTypeChecker, idProperty);
    }

    /**
     * Get the java class (if exists) from the document
     * @param id document id
     * @param document document to get java class from
     * @return java class
     */
    public getJsType(id: string, document: object): ObjectTypeDescriptor {
        return this._findJsType(id, document);
    }

    /**
     * Get the Java class name to be stored in the entity metadata
     * @param entityType Entity type
     * @return java class name
     */
    public getJsTypeName(entityType: ObjectTypeDescriptor): string {
        return this._findJsTypeName(entityType);
    }

    public clone(): DocumentConventions {
        const cloned = new DocumentConventions();
        return Object.assign(cloned, this);
    }

    /**
     *  Gets the identity property.
     *  @param documentType Class or type descriptor of entity
     *  @return Identity property (field)
     */
    public getIdentityProperty(documentType: DocumentType): string {
        const typeDescriptor = this.findEntityType(documentType);
        return this._registeredIdPropertyNames.get(typeDescriptor)
            || CONSTANTS.Documents.Metadata.ID_PROPERTY;
    }

    public updateFrom(configuration: ClientConfiguration): void {
        if (!configuration) {
            return;
        }

        const orig = this._originalConfiguration;
        if (configuration.disabled && !orig) { // nothing to do
            return;
        }

        if (configuration.disabled && orig) { // need to revert to original values
            this._maxNumberOfRequestsPerSession = orig.maxNumberOfRequestsPerSession;
            this._readBalanceBehavior = orig.readBalanceBehavior;

            this._originalConfiguration = null;
            return;
        }

        if (!this._originalConfiguration) {
            this._originalConfiguration = {
                etag: -1,
                maxNumberOfRequestsPerSession: this._maxNumberOfRequestsPerSession,
                readBalanceBehavior: this._readBalanceBehavior,
                disabled: false
            };
        }

        this._maxNumberOfRequestsPerSession =
            configuration.maxNumberOfRequestsPerSession || this._originalConfiguration.maxNumberOfRequestsPerSession;
        this._readBalanceBehavior =
            configuration.readBalanceBehavior || this._originalConfiguration.readBalanceBehavior;
    }

    public static defaultTransformCollectionNameToDocumentIdPrefix(collectionName: string): string {
        const upperCaseRegex = /[A-Z]/g;
        const upperCount = collectionName.match(upperCaseRegex).length;

        if (upperCount <= 1) {
            return collectionName.toLowerCase();
        }

        // multiple capital letters, so probably something that we want to preserve caps on.
        return collectionName;
    }

    // TBD public void RegisterQueryValueConverter<T>(TryConvertValueForQueryDelegate<T> converter)
    // TBD public bool TryConvertValueForQuery(string fieldName, object value, bool forRange, out string strValue)

    public freeze() {
        this._frozen = true;
    }

    private _assertNotFrozen(): void {
        if (this._frozen) {
            throwError("RavenException",
                "Conventions has been frozen after documentStore.initialize() and no changes can be applied to them");
        }
    }

    //
    public get registeredTypeDescriptors() {
        return this._registeredTypeDescriptors;
    }

    public get knownEntityTypes() {
        return this._knownTypes;
    }

    public findEntityType(documentType: DocumentType): ObjectTypeDescriptor;
    public findEntityType(typeName: string): ObjectTypeDescriptor;
    public findEntityType(docTypeOrtypeName: string): ObjectTypeDescriptor {
        if (!docTypeOrtypeName) {
            return null;
        }

        if (typeof(docTypeOrtypeName) !== "string") {
            return docTypeOrtypeName as ObjectTypeDescriptor;
        }
        
        return this._knownTypes.get(docTypeOrtypeName);
    }

    ////////////////////////
    // public get emptyChangeVector(): string {
    //     return null;
    // }

    // public get emptyCollection(): string {
    //     return "@empty";
    // }

    // public get systemMetaKeys(): string[] {
    //     return ["@collection", "Raven-Node-Type", "@nested_object_types"];
    // }

    // public getIdFromDocument<T extends Object = IRavenObject>(document?: T, documentType?: DocumentType<T>): string {
    //     // let docTypeDescriptor: DocumentTypeDescriptor;
    //     // if (typeof(documentType) === "string") {
    //     //     docTypeDescriptor = this._registeredTypeCheckers.find(x => x.name === documentType as string);
    //     // } else if (TypeUtil.isClassConstructor(document.constructor)) {
    //     //     docTypeDescriptor = document.constructor as DocumentConstructor;
    //     // }
    //     const docType: DocumentType<T> = documentType || this.getJsType(null, document);
    //     const idProperty = this.getIdentityProperty(docType);

    //     if (!document) {
    //         throwError("InvalidOperationException", "Empty entity provided.");
    //     }

    //     if (("Object" !== document.constructor.name) && !document.hasOwnProperty(idProperty)) {
    //         throwError("InvalidOperationException", "Invalid entity provided. It should implement object interface");
    //     }

    //     return document[idProperty] || (document["@metadata"] || {})["@id"] || null;
    // }

    // public getTypeFromDocument<T extends Object = IRavenObject>(
    //     document?: T, id?: string, documentType?: DocumentType<T>): DocumentType<T> {
    //     const metadata: object = document["@metadata"];

    //     if (TypeUtil.isClassConstructor(document.constructor)) {
    //         return document.constructor as DocumentConstructor<T>;
    //     }

    //     if (documentType) {
    //         return documentType;
    //     }

    //     if (metadata) {
    //         if (metadata["Raven-Node-Type"]) {
    //             return metadata["Raven-Node-Type"];
    //         }

    //         if (metadata["@collection"] && ("@empty" !== metadata["@collection"])) {
    //             return StringUtil.capitalize(pluralize.singular(metadata["@collection"]));
    //         }
    //     }

    //     let foundDocType: DocumentType<T> = null;
    //     let matches: string[];
        
    //     for (const typeChecker of this._registeredTypeCheckers) {
    //         try {
    //             if (typeChecker.isType(document)) {
    //                 foundDocType = typeChecker;
    //                 break;
    //             }
    //         } catch (err) {
    //             continue;
    //         }
    //     }

    //     if (foundDocType) {
    //         return foundDocType;
    //     }

    //     matches = /^(\w{1}[\w\d]+)\/\d*$/i.exec(id);
    //     if (id && matches) {
    //         return StringUtil.capitalize(pluralize.singular(matches[1]));
    //     }

    //     return null;
    // }

}

DocumentConventions.defaultConventions.freeze();
