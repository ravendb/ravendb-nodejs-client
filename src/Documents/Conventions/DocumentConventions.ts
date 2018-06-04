import { TypesAwareObjectMapper } from "../../Mapping/ObjectMapper";
import { 
    DocumentType, 
} from "../DocumentAbstractions";
import { 
    ObjectTypeDescriptor,
    ObjectLiteralDescriptor, 
    ClassConstructor
} from "../../Types";
import * as pluralize from "pluralize";
import { ClientConfiguration } from "../Operations/Configuration/ClientConfiguration";
import { ReadBalanceBehavior } from "../../Http/ReadBalanceBehavior";
import { throwError } from "../../Exceptions";
import { CONSTANTS } from "../../Constants";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DateUtil } from "../../Utility/DateUtil";
import { JsonSerializer } from "../../Mapping/Json/Serializer";

export type IdConvention = (databaseName: string, entity: object) => Promise<string>;
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
    
    private _knownEntityTypes: Map<string, ObjectTypeDescriptor>;

    private _entityObjectMapper: TypesAwareObjectMapper = new TypesAwareObjectMapper({
       knownTypes: this._knownEntityTypes,
       dateFormat: DateUtil.DEFAULT_DATE_FORMAT 
    });

    private _entityJsonSerializer: JsonSerializer;

    public constructor() {
        this._readBalanceBehavior = "None";
        this._identityPartsSeparator = "/";
        this._findIdentityPropertyNameFromCollectionName = entityName => "id";
        this._findJsType = (id: string, doc: object) => {
            const metadata = doc[CONSTANTS.Documents.Metadata.KEY];
            if (metadata) {
                const jsType = metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] as string;
                return this._knownEntityTypes.get(jsType) || null;
            }

            return null;
        };

        this._findJsTypeName = (ctorOrTypeChecker: ObjectTypeDescriptor) => {
            if (!ctorOrTypeChecker) {
                return null;
            }

            if (TypeUtil.isFunction(ctorOrTypeChecker["isType"])) {
                return (ctorOrTypeChecker as ObjectLiteralDescriptor).name;
            }

            return (ctorOrTypeChecker as ClassConstructor).name;
        };

        this._transformClassCollectionNameToDocumentIdPrefix =
            collectionName => DocumentConventions.defaultTransformCollectionNameToDocumentIdPrefix(collectionName);

        this._findCollectionName = type => DocumentConventions.defaultGetCollectionName(type);

        this._maxNumberOfRequestsPerSession = 30;
        this._maxHttpCacheSize = 128 * 1024 * 1024;

        this._knownEntityTypes = new Map();
        this._entityObjectMapper = new TypesAwareObjectMapper({
            dateFormat: DateUtil.DEFAULT_DATE_FORMAT,
            knownTypes: this._knownEntityTypes
        });

        this._entityJsonSerializer = JsonSerializer.getDefaultForEntities();
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
        if (!ctorOrTypeChecker) {
            return null;
        }

        if (!TypeUtil.isObjectTypeDescriptor(ctorOrTypeChecker)) {
            throwError("InvalidArgumentException", "Invalid class argument.");
        }

        if (!ctorOrTypeChecker.name) {
            throwError("InvalidArgumentException", "Type name cannot be null or undefined.");
        }

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
    public getCollectionNameForEntity(entity: object): string {
        if (!entity) {
            return null;
        }

        const typeDescriptor = this.getEntityTypeDescriptor(entity);
        if (typeDescriptor) {
            return this.getCollectionNameForType(typeDescriptor);
        }

        if (this._findCollectionNameForObjectLiteral && entity.constructor === Object) {
            return this._findCollectionNameForObjectLiteral(entity);
        }

        return null;
    }

    private _findCollectionNameForObjectLiteral: (entity: object) => string;
    
    public get findCollectionNameForObjectLiteral() {
        return this._findCollectionNameForObjectLiteral;
    }

    public set findCollectionNameForObjectLiteral(value: (entity: object) => string) {
        this._findCollectionNameForObjectLiteral = value;
    }

    public getEntityTypeDescriptor<T extends object>(entity: T): ObjectTypeDescriptor<T> {
        if (TypeUtil.isClass(entity.constructor)) {
            return entity.constructor as ClassConstructor;
        }

        for (const entityType of this._knownEntityTypes.values()) {
            if (!TypeUtil.isObjectLiteralTypeDescriptor(entityType)) {
                continue;
            }

            if ((entityType as ObjectLiteralDescriptor<T>).isType(entity)) {
                return entityType as ObjectLiteralDescriptor<T>;
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
    public generateDocumentId(database: string, entity: object): Promise<string> {
        const entityTypeDescriptor: ObjectTypeDescriptor = this.getEntityTypeDescriptor(entity);

        for (const [typeDescriptor, idConvention] of this._registeredIdConventions) {
            if (TypeUtil.isType(entity, typeDescriptor)) {
                return Promise.resolve(idConvention(database, entity));
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

    // public registerEntityTypeChecker(typeChecker: ObjectLiteralDescriptor) {
    //     this._registeredTypeDescriptors.push(typeChecker);
    // }

    public registerEntityIdPropertyName(ctorOrTypeChecker: ObjectTypeDescriptor, idProperty: string) {
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
    // public get registeredTypeDescriptors() {
    //     return this._registeredTypeDescriptors;
    // }
    public get knownEntityTypesByName() {
        return this._knownEntityTypes;
    }

    public get knownEntityTypes() {
        return Array.from(this._knownEntityTypes.values());
    }

    public registerEntityType(entityType: ObjectTypeDescriptor): this;
    public registerEntityType(entityType: ObjectTypeDescriptor, name: string): this;
    public registerEntityType(entityType: ObjectTypeDescriptor, name?: string): this {
        if (!TypeUtil.isObjectTypeDescriptor(entityType)) {
            throwError("InvalidArgumentException", 
                "Entity type must be a constructor or an object literal descriptor.");
        }

        if (name) {
            this._knownEntityTypes.set(name, entityType);
        }

        this._knownEntityTypes.set(entityType.name, entityType);
        return this;
    }

    public tryRegisterEntityType(docType: DocumentType): this {
        if (TypeUtil.isObjectTypeDescriptor(docType)) {
            this.registerEntityType(docType as ObjectTypeDescriptor);
        }

        return this;
    }

    public findEntityType<T extends object>(documentType: DocumentType<T>): ObjectTypeDescriptor<T>;
    public findEntityType<T extends object>(typeName: string): ObjectTypeDescriptor<T>;
    public findEntityType<T extends object>(docTypeOrtypeName: string): ObjectTypeDescriptor<T> {
        if (!docTypeOrtypeName) {
            return null;
        }

        if (typeof(docTypeOrtypeName) !== "string") {
            return docTypeOrtypeName as ObjectTypeDescriptor<T>;
        }
        
        return this._knownEntityTypes.get(docTypeOrtypeName) as ObjectLiteralDescriptor<T>;
    }
}

DocumentConventions.defaultConventions.freeze();
