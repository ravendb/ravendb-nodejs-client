import * as _ from "lodash";
import * as pluralize from "pluralize";
import { StringUtil } from "../../Utility/StringUtil";
import { TypeUtil } from "../../Utility/TypeUtil";
import { Serializer, IAttributeSerializer } from "../../Json/Serializer";
import { IRavenObject } from "../../Types/IRavenObject";
import { ConcurrencyCheckMode } from "../../Documents/Session/DocumentSession";
import { IRavenResponse } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { ReadBalanceBehavior } from "../../Http/ReadBalanceBehavior";
import { ClientConfiguration } from "../Operations/Configuration/ClientConfiguration";
import { IDocumentInfoResolvable, GenericEntityConstructor, DocumentType, IDocumentConversionResult } from "../DocumentAbstractions";

export type IdConvention = (databaseName: string, entity: object) => string;
export class DocumentConventions2 {
    public maxNumberOfRequestsPerSession: number = 30;
    public requestTimeout: number = 30;
    public defaultUseOptimisticConcurrency: boolean = true;
    public maxLengthOfQueryUsingGetUrl = 1024 + 512;
    public identityPartsSeparator = "/";
    private _resolvers: IDocumentInfoResolvable[] = [];
    private _serializers: IAttributeSerializer[] = [];
    private _idsNamesCache: Map<string, string> = new Map<string, string>();
    private _ctorsCache: Map<string, GenericEntityConstructor> = new Map<string, GenericEntityConstructor>();
    private _originalConfiguration: ClientConfiguration;

    private _readBalanceBehavior: ReadBalanceBehavior;
    private _maxHttpCacheSize: number;
    private _documentIdGenerator: IdConvention;
    private _frozen: boolean;

    private static _defaults: DocumentConventions = new DocumentConventions();

    public static get defaultConventions() {
        return this._defaults;
    }

    public get maxHttpCacheSize(): number {
        return this._maxHttpCacheSize;
    }

    public set maxHttpCacheSize(value: number) {
        this._maxHttpCacheSize = value;
    }
   
    public get readBalanceBehavior(): ReadBalanceBehavior {
        return this._readBalanceBehavior;
    }

    public set readBalanceBehavior(value: ReadBalanceBehavior) {
        this._readBalanceBehavior = value;
    }

    public get documentIdGenerator(): IdConvention {
        return this._documentIdGenerator;
    }

    public set documentIdGenerator(value: IdConvention) {
        this._documentIdGenerator = value;
    }

    public setIdOnlyIfPropertyIsDefined: boolean = false;
    public disableTopologyUpdates: boolean = false;

    public get emptyChangeVector(): string {
        return null;
    }

    public get emptyCollection(): string {
        return "@empty";
    }

    public get systemMetaKeys(): string[] {
        return ["@collection", "Raven-Node-Type", "@nested_object_types"];
    }

    public get serializers(): IAttributeSerializer[] {
        return this._serializers;
    }

    public addAttributeSerializer(serializer: IAttributeSerializer): void {
        if (!serializer) {
            throwError("ArgumentNullException", "Invalid serializer provided");
        }

        this._serializers.push(serializer);
    }

    public addDocumentInfoResolver(resolver: IDocumentInfoResolvable): void {
        if (!resolver) {
            throwError("ArgumentNullException", "Invalid resolver provided");
        }

        this._resolvers.push(resolver);
    }

    public getCollectionName(documentType: DocumentType): string {
        const typeName: string = this.getDocumentTypeName(documentType);

        return !typeName ? this.emptyCollection : pluralize(typeName);
    }

    public getDocumentTypeName(documentType: DocumentType): string {
        return TypeUtil.isFunction(documentType)
            ? (documentType as GenericEntityConstructor).name
            : documentType as string || null;
    }

    public getDocumentConstructor<T extends Object = IRavenObject>(
        documentType?: DocumentType<T>): GenericEntityConstructor<T> | null {
        const typeName: string = documentType as string;
        let foundCtor: GenericEntityConstructor<T>;

        if (!documentType) {
            return null;
        }

        if (TypeUtil.isFunction(documentType)) {
            return documentType as GenericEntityConstructor<T>;
        }

        if (this._ctorsCache.has(typeName)) {
            foundCtor = this._ctorsCache.get(typeName) as GenericEntityConstructor<T>;
        } else {
            for (const resolver of this._resolvers) {
                try {
                    foundCtor = resolver.resolveConstructor(typeName) as GenericEntityConstructor<T>;
                } catch (exception) {
                    foundCtor = null;
                }

                if (!TypeUtil.isNull(foundCtor)) {
                    this._ctorsCache.set(typeName, foundCtor);
                    break;
                }
            }
        }

        return foundCtor;
    }

    public getIdPropertyName<T extends Object = IRavenObject>(
        documentType?: DocumentType<T>, document?: T | object): string {
        let typeName: string = documentType as string;
        let foundIdPropertyName: string;

        if (TypeUtil.isFunction(documentType)) {
            typeName = (documentType as GenericEntityConstructor<T>).name;
        }

        if (this._idsNamesCache.has(typeName)) {
            foundIdPropertyName = this._idsNamesCache.get(typeName);
        } else {
            for (const resolver of this._resolvers) {
                try {
                    foundIdPropertyName = resolver.resolveIdProperty(typeName, document);
                } catch (exception) {
                    foundIdPropertyName = null;
                }

                if (!TypeUtil.isNull(foundIdPropertyName)) {
                    this._idsNamesCache.set(typeName, foundIdPropertyName);
                    break;
                }
            }
        }

        return foundIdPropertyName || "id";
    }

    public convertToDocument<T extends Object = IRavenObject>(
        rawEntity: object, 
        documentType?: DocumentType<T>, 
        nestedObjectTypes: IRavenObject<GenericEntityConstructor> = {}): IDocumentConversionResult<T> {
        const metadata: object = _.get(rawEntity, "@metadata") || {};
        const originalMetadata: object = _.cloneDeep(metadata);
        const docType: DocumentType<T> = documentType || metadata["Raven-Node-Type"];
        const docCtor: GenericEntityConstructor<T> = this.getDocumentConstructor(docType);

        const documentAttributes: object = _.omit(rawEntity, "@metadata");
        const document: T = Serializer.fromJSON<T>(
            docCtor ? new docCtor() : ({} as T),
            documentAttributes, metadata, nestedObjectTypes, this
        );

        this.setIdOnDocument(
            document, metadata
            ["@id"] || null, docType
        );

        return {
            rawEntity,
            document: document as T, 
            metadata,
            originalMetadata,
            documentType
        } as IDocumentConversionResult<T>;
    }

    public convertToRawEntity<T extends Object = IRavenObject>(document: T, documentType?: DocumentType<T>): object {
        const idProperty: string = this.getIdPropertyName(documentType, document);
        const result: object = Serializer.toJSON<T>(document, this);

        if (idProperty) {
            delete result[idProperty];
        }

        return result;
    }

    public tryFetchResults(commandResponse: IRavenResponse): object[] {
        let responseResults: object[] = [];

        if (("Results" in commandResponse) && Array.isArray(commandResponse.Results)) {
            responseResults = commandResponse.Results as object[] || [];
        }

        return responseResults;
    }

    public tryFetchIncludes(commandResponse: IRavenResponse): object[] {
        let responseIncludes: object[] = [];

        if ("Includes" in commandResponse) {
            if (Array.isArray(commandResponse.Includes)) {
                responseIncludes = commandResponse.Includes as object[] || [];
            } else if (TypeUtil.isObject(commandResponse.Includes)) {
                responseIncludes = (_.values(commandResponse.Includes)) as object[] || [];
            }
        }

        return responseIncludes;
    }

    public checkIsProjection(responseItem: object): boolean {
        if ("@metadata" in responseItem) {
            const metadata: object = responseItem["@metadata"];

            if (TypeUtil.isObject(metadata)) {
                return true === metadata["@projection"];
            }
        }

        return false;
    }

    public setIdOnDocument<T extends Object = IRavenObject>(
        document: T, id: string, documentType?: DocumentType<T>): T {
        if ("object" !== (typeof document)) {
            throwError("InvalidOperationException", "Invalid entity provided. It should implement object interface");
        }

        const docType: DocumentType<T> = documentType || this.getTypeFromDocument(document);
        const idProperty = this.getIdPropertyName(docType, document);

        if (!this.setIdOnlyIfPropertyIsDefined || (idProperty in document)) {
            document[idProperty] = id;
        }

        return document;
    }

    public getIdFromDocument<T extends Object = IRavenObject>(document?: T, documentType?: DocumentType<T>): string {
        const docType: DocumentType<T> = documentType || this.getTypeFromDocument(document);
        const idProperty = this.getIdPropertyName(docType, document);

        if (!document) {
            throwError("InvalidOperationException", "Empty entity provided.");
        }

        if (("Object" !== document.constructor.name) && !document.hasOwnProperty(idProperty)) {
            throwError("InvalidOperationException", "Invalid entity provided. It should implement object interface");
        }

        return document[idProperty] || (document["@metadata"] || {})["@id"] || null;
    }

    public getTypeFromDocument<T extends Object = IRavenObject>(
        document?: T, id?: string, documentType?: DocumentType<T>): DocumentType<T> {
        const metadata: object = document["@metadata"];

        if ("Object" !== document.constructor.name) {
            return document.constructor as GenericEntityConstructor<T>;
        }

        if (documentType) {
            return documentType;
        }

        if (metadata) {
            if (metadata["Raven-Node-Type"]) {
                return metadata["Raven-Node-Type"];
            }

            if (metadata["@collection"] && ("@empty" !== metadata["@collection"])) {
                return StringUtil.capitalize(pluralize.singular(metadata["@collection"]));
            }
        }

        let foundDocType: DocumentType<T>;
        let matches: string[];

        for (const resolver of this._resolvers) {
            try {
                foundDocType = resolver.resolveDocumentType(document as object, id, documentType) as DocumentType<T>;
            } catch (exception) {
                foundDocType = null;
            }

            if (foundDocType) {
                break;
            }
        }

        if (foundDocType) {
            return foundDocType;
        }

        matches = /^(\w{1}[\w\d]+)\/\d*$/i.exec(id)
        if (id && matches) {
            return StringUtil.capitalize(pluralize.singular(matches[1]));
        }

        return null;
    }

    public buildDefaultMetadata<T extends Object = IRavenObject>(document: T, documentType: DocumentType<T>): object {
        const metadata: object = {};
        const nestedTypes: object = {};
        let property: string;
        let value: any;

        const findNestedType = (prop, val: any): void => {
            if (val instanceof Date) {
                nestedTypes[prop] = "date";
            } else if (TypeUtil.isObject(val)) {
                const docType: string = val.constructor.name;

                if ("Object" !== docType) {
                    nestedTypes[prop] = docType;
                }
            }
        };

        if (document) {
            let ravenNodeType;
            if (TypeUtil.isFunction(documentType)) {
                ravenNodeType = (documentType as GenericEntityConstructor<T>).name;
            } else {
                ravenNodeType = (documentType as string) 
                    ? StringUtil.capitalize(documentType as string) 
                    : null;
            }

            _.assign(metadata, document["@metadata"] || {}, {
                "@collection": this.getCollectionName(documentType),
                "Raven-Node-Type": ravenNodeType
            });

            for (property in document) {
                if (document.hasOwnProperty(property)) {
                    value = document[property];

                    if (Array.isArray(value) && value.length) {
                        findNestedType(property, _.first(value));
                    } else {
                        findNestedType(property, value);
                    }
                }
            }

            if (!_.isEmpty(nestedTypes)) {
                metadata["@nested_object_types"] = nestedTypes;
            }
        }

        return metadata;
    }

    //

    public clone(): DocumentConventions {
        const cloned = new DocumentConventions();
        return Object.assign(cloned, this);
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
            this.maxNumberOfRequestsPerSession = orig.maxNumberOfRequestsPerSession;
            this._readBalanceBehavior = orig.readBalanceBehavior;

            this._originalConfiguration = null;
            return;
        }

        if (!this._originalConfiguration) {
            this._originalConfiguration = {
                etag: -1,
                maxNumberOfRequestsPerSession: this.maxNumberOfRequestsPerSession,
                readBalanceBehavior: this._readBalanceBehavior,
                disabled: false
            };
        }

        this.maxNumberOfRequestsPerSession =
            configuration.maxNumberOfRequestsPerSession || this._originalConfiguration.maxNumberOfRequestsPerSession;
        this._readBalanceBehavior =
            configuration.readBalanceBehavior || this._originalConfiguration.readBalanceBehavior;
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
}
