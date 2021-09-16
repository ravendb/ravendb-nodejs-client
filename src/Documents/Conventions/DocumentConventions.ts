import { TypesAwareObjectMapper } from "../../Mapping/ObjectMapper";
import {
    DocumentType,
} from "../DocumentAbstractions";
import {
    ObjectTypeDescriptor,
    ObjectLiteralDescriptor,
    ClassConstructor, EntityConstructor, Field
} from "../../Types";
import * as pluralize from "pluralize";
import { ClientConfiguration } from "../Operations/Configuration/ClientConfiguration";
import { ReadBalanceBehavior } from "../../Http/ReadBalanceBehavior";
import { throwError } from "../../Exceptions";
import { CONSTANTS } from "../../Constants";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DateUtil, DateUtilOpts } from "../../Utility/DateUtil";
import { CasingConvention, ObjectUtil, ObjectChangeCaseOptions } from "../../Utility/ObjectUtil";
import { LoadBalanceBehavior } from "../../Http/LoadBalanceBehavior";
import { BulkInsertConventions } from "./BulkInsertConventions";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations";

export type IdConvention = (databaseName: string, entity: object) => Promise<string>;
export type IValueForQueryConverter<T> =
    (fieldName: Field<T>, value: T, forRange: boolean, stringValue: (value: any) => void) => boolean;

function createServerDefaults() {
    const conventions = new DocumentConventions();
    conventions.sendApplicationIdentifier = false;
    conventions.freeze();
    return conventions;
}


export class DocumentConventions {

    private static _defaults: DocumentConventions = new DocumentConventions();
    public static defaultForServerConventions = createServerDefaults();

    public static get defaultConventions() {
        return this._defaults;
    }

    private static _cachedDefaultTypeCollectionNames: Map<ObjectTypeDescriptor, string> = new Map();

    private readonly _listOfQueryValueToObjectConverters:
        { Type: EntityConstructor<any>; Converter: IValueForQueryConverter<any> }[] = [];

    private _registeredIdConventions:
        Map<ObjectTypeDescriptor, IdConvention> = new Map();

    private _registeredIdPropertyNames:
        Map<ObjectTypeDescriptor, string> = new Map();

    private _frozen: boolean;
    private _originalConfiguration: ClientConfiguration;
    private _identityPartsSeparator: string;
    private _disableTopologyUpdates: boolean;

    private _disableAtomicDocumentWritesInClusterWideTransaction: boolean;
    private _shouldIgnoreEntityChanges: (sessionOperations: InMemoryDocumentSessionOperations, entity: object, documentId: string) => boolean;

    private _transformClassCollectionNameToDocumentIdPrefix: (maybeClassCollectionName: string) => string;
    private _documentIdGenerator: IdConvention;

    private _loadBalancerPerSessionContextSelector: (databaseName: string) => string;

    private _findCollectionName: (constructorOrTypeChecker: ObjectTypeDescriptor) => string;

    private _identityProperty: string;

    private _findJsTypeName: (ctorOrTypeChecker: ObjectTypeDescriptor) => string;
    private _findJsType: (id: string, doc: object) => ObjectTypeDescriptor;

    private _useOptimisticConcurrency: boolean;
    private _throwIfQueryPageSizeIsNotSet: boolean;
    private _maxNumberOfRequestsPerSession: number;

    private _requestTimeout: number | undefined;
    private _firstBroadcastAttemptTimeout: number | undefined;
    private _secondBroadcastAttemptTimeout: number | undefined;
    private _waitForIndexesAfterSaveChangesTimeout: number | undefined;
    private _waitForReplicationAfterSaveChangesTimeout: number | undefined;
    private _waitForNonStaleResultsTimeout: number | undefined;

    private _loadBalancerContextSeed: number;
    private _loadBalanceBehavior: LoadBalanceBehavior;
    private _readBalanceBehavior: ReadBalanceBehavior;
    private _maxHttpCacheSize: number;

    private readonly _knownEntityTypes: Map<string, ObjectTypeDescriptor>;

    private _localEntityFieldNameConvention: CasingConvention;
    private _remoteEntityFieldNameConvention: CasingConvention;

    private _objectMapper: TypesAwareObjectMapper;
    private _dateUtil: DateUtil;
    private _syncJsonParseLimit: number;

    private _useCompression: boolean;
    private _sendApplicationIdentifier: boolean;

    private readonly _bulkInsert: BulkInsertConventions;

    public get bulkInsert() {
        return this._bulkInsert;
    }

    public constructor() {
        this._readBalanceBehavior = "None";
        this._identityPartsSeparator = "/";
        this._identityProperty = CONSTANTS.Documents.Metadata.ID_PROPERTY;
        
        this._findJsType = (id: string, doc: object) => {
            const metadata = doc[CONSTANTS.Documents.Metadata.KEY];
            if (metadata) {
                const jsType = metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE] as string;
                return this.getJsTypeByDocumentType(jsType);
            }

            return null;
        };

        this._findJsTypeName = (ctorOrTypeChecker: ObjectTypeDescriptor) => {
            if (!ctorOrTypeChecker) {
                return null;
            }

            const name = (ctorOrTypeChecker as ClassConstructor).name;
            if (name === "Object") {
                return null;
            }

            return name;
        };

        this._transformClassCollectionNameToDocumentIdPrefix =
            collectionName => DocumentConventions.defaultTransformCollectionNameToDocumentIdPrefix(collectionName);

        this._findCollectionName = type => DocumentConventions.defaultGetCollectionName(type);

        this._maxNumberOfRequestsPerSession = 30;
        this._bulkInsert = new BulkInsertConventions(() => this._assertNotFrozen());
        this._maxHttpCacheSize = 128 * 1024 * 1024;

        this._knownEntityTypes = new Map();
        this._objectMapper = new TypesAwareObjectMapper({
            dateFormat: DateUtil.DEFAULT_DATE_FORMAT,
            documentConventions: this
        });

        this._useCompression = null;

        this._dateUtilOpts = {};
        this._dateUtil = new DateUtil(this._dateUtilOpts);
        this._syncJsonParseLimit = 2 * 1_024 * 1_024;

        this._firstBroadcastAttemptTimeout = 5_000;
        this._secondBroadcastAttemptTimeout = 30_000;

        this._waitForIndexesAfterSaveChangesTimeout = 15_000;
        this._waitForReplicationAfterSaveChangesTimeout = 15_000;
        this._waitForNonStaleResultsTimeout = 15_000;

        this._sendApplicationIdentifier = true;
    }

    public get requestTimeout() {
        return this._requestTimeout;
    }

    public set requestTimeout(requestTimeout: number) {
        this._assertNotFrozen();
        this._requestTimeout = requestTimeout;
    }

    /**
     * Enables sending a unique application identifier to the RavenDB Server that is used for Client API usage tracking.
     * It allows RavenDB Server to issue performance hint notifications e.g. during robust topology update requests which could indicate Client API misuse impacting the overall performance
     * @return if option is enabled
     */
    public get sendApplicationIdentifier() {
        return this._sendApplicationIdentifier;
    }

    /**
     * Enables sending a unique application identifier to the RavenDB Server that is used for Client API usage tracking.
     * It allows RavenDB Server to issue performance hint notifications e.g. during robust topology update requests which could indicate Client API misuse impacting the overall performance
     * @param sendApplicationIdentifier if option should be enabled
     */
    public set sendApplicationIdentifier(sendApplicationIdentifier: boolean) {
        this._assertNotFrozen();
        this._sendApplicationIdentifier = sendApplicationIdentifier;
    }

    /**
     * Get the timeout for the second broadcast attempt.
     * Default: 30 seconds
     *
     * Upon failure of the first attempt the request executor will resend the command to all nodes simultaneously.
     * @return broadcast timeout
     */
    public get secondBroadcastAttemptTimeout() {
        return this._secondBroadcastAttemptTimeout;
    }

    /**
     * Set the timeout for the second broadcast attempt.
     * Default: 30 seconds
     *
     * Upon failure of the first attempt the request executor will resend the command to all nodes simultaneously.
     *
     * @param secondBroadcastAttemptTimeout broadcast timeout
     */
    public set secondBroadcastAttemptTimeout(secondBroadcastAttemptTimeout: number) {
        this._assertNotFrozen();
        this._secondBroadcastAttemptTimeout = secondBroadcastAttemptTimeout;
    }

    /**
     * Get the timeout for the first broadcast attempt.
     * Default: 5 seconds
     *
     * First attempt will send a single request to a selected node.
     * @return broadcast timeout
     */
    public get firstBroadcastAttemptTimeout() {
        return this._firstBroadcastAttemptTimeout;
    }

    /**
     * Set the timeout for the first broadcast attempt.
     * Default: 5 seconds
     *
     * First attempt will send a single request to a selected node.
     *
     * @param firstBroadcastAttemptTimeout broadcast timeout
     */
    public set firstBroadcastAttemptTimeout(firstBroadcastAttemptTimeout: number) {
        this._assertNotFrozen();
        this._firstBroadcastAttemptTimeout = firstBroadcastAttemptTimeout;
    }

    public get objectMapper(): TypesAwareObjectMapper {
        return this._objectMapper;
    }

    public set objectMapper(value: TypesAwareObjectMapper) {
        this._assertNotFrozen();
        this._objectMapper = value;
    }

    /**
     * Sets json length limit for sync parsing. Beyond that size
     * we fallback to async parsing
     */
    public get syncJsonParseLimit(): number {
        return this._syncJsonParseLimit;
    }

    /**
     * Gets json length limit for sync parsing. Beyond that size
     * we fallback to async parsing
     */
    public set syncJsonParseLimit(value: number) {
        this._assertNotFrozen();
        this._syncJsonParseLimit = value;
    }

    public get dateUtil(): DateUtil {
        return this._dateUtil;
    }

    public get readBalanceBehavior(): ReadBalanceBehavior {
        return this._readBalanceBehavior;
    }

    public set readBalanceBehavior(value: ReadBalanceBehavior) {
        this._assertNotFrozen();
        this._readBalanceBehavior = value;
    }

    public get loadBalancerContextSeed() {
        return this._loadBalancerContextSeed;
    }

    public set loadBalancerContextSeed(seed: number) {
        this._assertNotFrozen();
        this._loadBalancerContextSeed = seed;
    }

    /**
     * We have to make this check so if admin activated this, but client code did not provide the selector,
     * it is still disabled. Relevant if we have multiple clients / versions at once.
     */
    public get loadBalanceBehavior() {
        return this._loadBalanceBehavior;
    }

    public set loadBalanceBehavior(loadBalanceBehavior: LoadBalanceBehavior) {
        this._assertNotFrozen();
        this._loadBalanceBehavior = loadBalanceBehavior;
    }

    /**
     * Gets the function that allow to specialize the topology
     * selection for a particular session. Used in load balancing
     * scenarios
     */
    public get loadBalancerPerSessionContextSelector(): (databaseName: string) => string {
        return this._loadBalancerPerSessionContextSelector;
    }

    /**
     * Sets the function that allow to specialize the topology
     * selection for a particular session. Used in load balancing
     * scenarios
     * @param selector selector to use
     */
    public set loadBalancerPerSessionContextSelector(selector: (databaseName: string) => string) {
        this._loadBalancerPerSessionContextSelector = selector;
    }

    public get entityFieldNameConvention(): CasingConvention {
        return this._localEntityFieldNameConvention;
    }

    public set entityFieldNameConvention(val) {
        this._assertNotFrozen();
        this._localEntityFieldNameConvention = val;
    }

    public get remoteEntityFieldNameConvention() {
        return this._remoteEntityFieldNameConvention;
    }

    public set remoteEntityFieldNameConvention(val) {
        this._assertNotFrozen();
        this._remoteEntityFieldNameConvention = val;
    }

    public set useOptimisticConcurrency(val) {
        this._assertNotFrozen();
        this._useOptimisticConcurrency = val;
    }

    public get useOptimisticConcurrency() {
        return this._useOptimisticConcurrency;
    }

    public deserializeEntityFromJson(documentType: ObjectTypeDescriptor, document: object): object {
        try {
            const typeName = documentType ? documentType.name : null;
            return this.objectMapper.fromObjectLiteral(document, { typeName });
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
        this._assertNotFrozen();
        this._maxHttpCacheSize = value;
    }

    public get hasExplicitlySetCompressionUsage() {
        return this._useCompression !== null;
    }

    public get waitForIndexesAfterSaveChangesTimeout() {
        return this._waitForIndexesAfterSaveChangesTimeout;
    }

    public set waitForIndexesAfterSaveChangesTimeout(value: number) {
        this._assertNotFrozen();
        this._waitForIndexesAfterSaveChangesTimeout = value;
    }

    public get waitForNonStaleResultsTimeout() {
        return this._waitForNonStaleResultsTimeout;
    }

    public set waitForNonStaleResultsTimeout(value: number) {
        this._assertNotFrozen();
        this._waitForNonStaleResultsTimeout = value;
    }

    public get waitForReplicationAfterSaveChangesTimeout() {
        return this._waitForNonStaleResultsTimeout;
    }

    public set waitForReplicationAfterSaveChangesTimeout(value: number) {
        this._assertNotFrozen();
        this._waitForReplicationAfterSaveChangesTimeout = value;
    }

    public get useCompression() {
        if (this._useCompression === null) {
            return true;
        }

        return this._useCompression;
    }

    public set useCompression(value) {
        this._assertNotFrozen();
        this._useCompression = value;
    }

    private _dateUtilOpts: DateUtilOpts;

    public get storeDatesInUtc() {
        return this._dateUtilOpts.useUtcDates;
    }

    public set storeDatesInUtc(value) {
        this._assertNotFrozen();
        this._dateUtilOpts.useUtcDates = value;
    }

    public get storeDatesWithTimezoneInfo() {
        return this._dateUtilOpts.withTimezone;
    }

    public set storeDatesWithTimezoneInfo(value) {
        this._assertNotFrozen();
        this._dateUtilOpts.withTimezone = true;
    } 

    /**
     * If set to 'true' then it will throw an exception when any query is performed (in session)
     * without explicit page size set.
     * This can be useful for development purposes to pinpoint all the possible performance bottlenecks
     * since from 4.0 there is no limitation for number of results returned from server.
     */
    public isThrowIfQueryPageSizeIsNotSet(): boolean {
        return this._throwIfQueryPageSizeIsNotSet;
    }

    /**
     * If set to 'true' then it will throw an exception when any query is performed (in session)
     * without explicit page size set.
     * This can be useful for development purposes to pinpoint all the possible performance bottlenecks
     * since from 4.0 there is no limitation for number of results returned from server.
     */
    public setThrowIfQueryPageSizeIsNotSet(throwIfQueryPageSizeIsNotSet: boolean): void {
        this._assertNotFrozen();
        this._throwIfQueryPageSizeIsNotSet = throwIfQueryPageSizeIsNotSet;
    }

    /**
     * Whether UseOptimisticConcurrency is set to true by default for all opened sessions
     */
    public isUseOptimisticConcurrency(): boolean {
        return this._useOptimisticConcurrency;
    }

    /**
     * Whether UseOptimisticConcurrency is set to true by default for all opened sessions
     */
    public setUseOptimisticConcurrency(useOptimisticConcurrency: boolean): void {
        this._assertNotFrozen();
        this._useOptimisticConcurrency = useOptimisticConcurrency;
    }

    public get identityProperty() {
        return this._identityProperty;
    }

    public set identityProperty(val) {
        this._assertNotFrozen();
        this._identityProperty = val;
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
        this._assertNotFrozen();

        if (this.identityPartsSeparator === "|") {
            throwError("InvalidArgumentException", "Cannot set identity parts separator to '|'");
        }

        this._identityPartsSeparator = value;
    }

    public get shouldIgnoreEntityChanges() {
        return this._shouldIgnoreEntityChanges;
    }

    public set shouldIgnoreEntityChanges(
        shouldIgnoreEntityChanges: (sessionOperations: InMemoryDocumentSessionOperations, entity: object, documentId: string) => boolean) {
        this._assertNotFrozen();
        this._shouldIgnoreEntityChanges = shouldIgnoreEntityChanges;
    }

    public get disableTopologyUpdates(): boolean {
        return this._disableTopologyUpdates;
    }

    public set disableTopologyUpdates(value: boolean) {
        this._assertNotFrozen();
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
        this._assertNotFrozen();
        this._transformClassCollectionNameToDocumentIdPrefix = value;
    }

    /**
     *  Default method used when finding a collection name for a type
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
     */
    public getCollectionNameForType(ctorOrTypeChecker: ObjectTypeDescriptor): string {
        const collectionName: string = this._findCollectionName(ctorOrTypeChecker);
        return collectionName || DocumentConventions.defaultGetCollectionName(ctorOrTypeChecker);
    }

    /**
     * Gets the collection name for a given type.
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

    public getTypeDescriptorByEntity<T extends object>(entity: T): ObjectTypeDescriptor<T> {
        return this.getEntityTypeDescriptor(entity);
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
     */
    public generateDocumentId(database: string, entity: object): Promise<string> {
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
     */
    public registerIdConvention<TEntity>(
        ctorOrTypeChecker: ObjectTypeDescriptor,
        idConvention: IdConvention): DocumentConventions {
        this._assertNotFrozen();

        this._registeredIdConventions.set(ctorOrTypeChecker, idConvention);

        return this;
    }

    public registerEntityIdPropertyName(ctorOrTypeChecker: ObjectTypeDescriptor, idProperty: string) {
        this._registeredIdPropertyNames.set(ctorOrTypeChecker, idProperty);
    }

    /**
     * Get the java class (if exists) from the document
     */
    public getJsType(id: string, document: object): ObjectTypeDescriptor {
        return this._findJsType(id, document);
    }

    /**
     * Get the Java class name to be stored in the entity metadata
     */
    public getJsTypeName(entityType: ObjectTypeDescriptor): string {
        return this._findJsTypeName(entityType);
    }

    /**
     * EXPERT: Disable automatic atomic writes with cluster write transactions. If set to 'true', will only consider explicitly
     * added compare exchange values to validate cluster wide transactions.
     */
    public get disableAtomicDocumentWritesInClusterWideTransaction() {
        return this._disableAtomicDocumentWritesInClusterWideTransaction;
    }

    /**
     * EXPERT: Disable automatic atomic writes with cluster write transactions. If set to 'true', will only consider explicitly
     * added compare exchange values to validate cluster wide transactions.
     */
    public set disableAtomicDocumentWritesInClusterWideTransaction(disableAtomicDocumentWritesInClusterWideTransaction: boolean) {
        this._assertNotFrozen();
        this._disableAtomicDocumentWritesInClusterWideTransaction = disableAtomicDocumentWritesInClusterWideTransaction;
    }

    public clone(): DocumentConventions {
        const cloned = new DocumentConventions();
        return Object.assign(cloned, this);
    }

    /**
     *  Gets the identity property.
     */
    public getIdentityProperty(documentType: DocumentType): string {
        const typeDescriptor = this.getJsTypeByDocumentType(documentType);
        return this._registeredIdPropertyNames.get(typeDescriptor)
            || this._identityProperty;
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
            this._maxNumberOfRequestsPerSession = orig.maxNumberOfRequestsPerSession ?? this.maxNumberOfRequestsPerSession;
            this._readBalanceBehavior = orig.readBalanceBehavior ?? this._readBalanceBehavior;
            this._identityPartsSeparator = orig.identityPartsSeparator ?? this._identityPartsSeparator;
            this._loadBalanceBehavior = orig.loadBalanceBehavior ?? this._loadBalanceBehavior;
            this._loadBalancerContextSeed = orig.loadBalancerContextSeed ?? this._loadBalancerContextSeed;

            this._originalConfiguration = null;
            return;
        }

        if (!this._originalConfiguration) {
            this._originalConfiguration = {
                etag: -1,
                maxNumberOfRequestsPerSession: this._maxNumberOfRequestsPerSession,
                readBalanceBehavior: this._readBalanceBehavior,
                identityPartsSeparator: this._identityPartsSeparator,
                loadBalanceBehavior: this._loadBalanceBehavior,
                loadBalancerContextSeed: this._loadBalancerContextSeed,
                disabled: false
            };
        }

        this._maxNumberOfRequestsPerSession =
            configuration.maxNumberOfRequestsPerSession
            ?? this._originalConfiguration.maxNumberOfRequestsPerSession
            ?? this._maxNumberOfRequestsPerSession;

        this._readBalanceBehavior =
            configuration.readBalanceBehavior
            ?? this._originalConfiguration.readBalanceBehavior
            ?? this._readBalanceBehavior;

        this._loadBalanceBehavior =
            configuration.loadBalanceBehavior
            ?? this._originalConfiguration.loadBalanceBehavior
            ?? this._loadBalanceBehavior;

        this._loadBalancerContextSeed =
            configuration.loadBalancerContextSeed
            ?? this._originalConfiguration.loadBalancerContextSeed
            ?? this._loadBalancerContextSeed;

        this._identityPartsSeparator =
            configuration.identityPartsSeparator
            ?? this._originalConfiguration.identityPartsSeparator
            ?? this._identityPartsSeparator;
    }

    public static defaultTransformCollectionNameToDocumentIdPrefix(collectionName: string): string {
        const upperCaseRegex = /[A-Z]/g;
        const m = collectionName.match(upperCaseRegex);
        const upperCount = m ? m.length : 0;

        if (upperCount <= 1) {
            return collectionName.toLowerCase();
        }

        // multiple capital letters, so probably something that we want to preserve caps on.
        return collectionName;
    }

    /* TBD 4.1 custom serializers
    public registerQueryValueConverter<T extends object>(type: EntityConstructor<T>,
                                                         converter: IValueForQueryConverter<T>) {
        this._assertNotFrozen();

        let index;
        for (index = 0; index < this._listOfQueryValueToObjectConverters.length; index++) {
            const entry = this._listOfQueryValueToObjectConverters[index];
            if (type instanceof entry.Type) {
                break;
            }
        }

        this._listOfQueryValueToObjectConverters.splice(index, 0, {
            Type: type,
            Converter: (fieldName, value, forRange, stringValue) => {
                if (value instanceof type) {
                    return converter(fieldName, value, forRange, stringValue);
                }
                stringValue(null);
                return false;
            }
        });
    }
    */

    public tryConvertValueToObjectForQuery(fieldName: string, value: any, forRange: boolean, strValue: (value: any) => void) {
        for (const queryValueConverter of this._listOfQueryValueToObjectConverters) {
            if (!(value instanceof queryValueConverter.Type)) {
                continue;
            }

            return queryValueConverter.Converter(fieldName, value, forRange, strValue);
        }

        strValue(null);
        return false;
    }

    public freeze() {
        this._frozen = true;
    }

    private _assertNotFrozen(): void {
        if (this._frozen) {
            throwError("RavenException",
                "Conventions has been frozen after documentStore.initialize() and no changes can be applied to them");
        }
    }

    public get knownEntityTypesByName() {
        return this._knownEntityTypes;
    }

    public get knownEntityTypes() {
        return Array.from(this._knownEntityTypes.values());
    }

    public registerJsType(entityType: ObjectTypeDescriptor): this;
    public registerJsType(entityType: ObjectTypeDescriptor, name: string): this;
    public registerJsType(entityType: ObjectTypeDescriptor, name?: string): this {
        return this.registerEntityType(entityType, name);
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

    public tryRegisterJsType(docType: DocumentType): this {
        return this.tryRegisterEntityType(docType);
    }

    public tryRegisterEntityType(docType: DocumentType): this {
        if (TypeUtil.isObjectTypeDescriptor(docType)) {
            this.registerJsType(docType as ObjectTypeDescriptor);
        }

        return this;
    }

    public getJsTypeByDocumentType<T extends object>(documentType: DocumentType<T>): ObjectTypeDescriptor<T>;
    public getJsTypeByDocumentType<T extends object>(typeName: string): ObjectTypeDescriptor<T>;
    public getJsTypeByDocumentType<T extends object>(
        docTypeOrTypeName: string | DocumentType<T>): ObjectTypeDescriptor<T> {
        if (!docTypeOrTypeName) {
            return null;
        }

        if (typeof(docTypeOrTypeName) === "string") {
            return this._knownEntityTypes.get(
                docTypeOrTypeName) as ObjectLiteralDescriptor<T> || null;
        }

        if (docTypeOrTypeName.name === "Object") {
            return null;
        }

        return docTypeOrTypeName as ObjectTypeDescriptor<T>;
    }

    public transformObjectKeysToRemoteFieldNameConvention(obj: object, opts?: ObjectChangeCaseOptions) {
        if (!this._remoteEntityFieldNameConvention) {
            return obj;
        }

        const options: any = opts || {
            recursive: true,
            arrayRecursive: true,

            ignorePaths: [
                CONSTANTS.Documents.Metadata.IGNORE_CASE_TRANSFORM_REGEX,
            ]
        };
        options.defaultTransform = this._remoteEntityFieldNameConvention;

        return ObjectUtil.transformObjectKeys(obj, options);
    }

    public transformObjectKeysToLocalFieldNameConvention(
        obj: object, opts?: ObjectChangeCaseOptions) {
        if (!this._localEntityFieldNameConvention) {
            return obj as object;
        }

        const options = opts || {
            recursive: true,
            arrayRecursive: true,
            ignorePaths: [
                CONSTANTS.Documents.Metadata.IGNORE_CASE_TRANSFORM_REGEX,
                /@projection/
            ]
        } as any;

        options.defaultTransform = this._localEntityFieldNameConvention;

        return ObjectUtil.transformObjectKeys(obj, options as ObjectChangeCaseOptions);
    }

    public validate() {
        if ((this._remoteEntityFieldNameConvention && !this._localEntityFieldNameConvention)
            || (!this._remoteEntityFieldNameConvention && this._localEntityFieldNameConvention)) {
            throwError("ConfigurationException",
                "When configuring field name conventions, "
                + "one has to configure both local and remote field name convention.");
        }
    }
}


DocumentConventions.defaultConventions.freeze();
