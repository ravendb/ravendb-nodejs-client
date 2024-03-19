import { FieldIndexing, FieldStorage, FieldTermVector } from "./Enums";
import { MetadataObject } from "../Session/MetadataObject";
import { AttachmentName, IAttachmentObject } from "../Attachments";
import { CapitalizeType } from "../../Types";

export type IndexingMapDefinition<TInput, TOutput> = (document: TInput) => TOutput | TOutput[];

export type IndexingReduceDefinition<TItem> = (result: IndexingGroupResults<TItem>) => IndexingMapReduceFormatter<TItem>;

type KeySelector<TDocument, TKey> = (document: TDocument) => TKey;

export interface CreateFieldOptions {
    storage?: boolean;
    indexing?: FieldIndexing;
    termVector?: FieldTermVector;
}

export interface IndexingMapUtils {
    load<T = any>(documentId: string, collection: string): T;
    cmpxchg<T = any>(key: string): T;
    getMetadata(document: any): MetadataObject;
    id(document: any): string;
    createSpatialField(wkt: string): SpatialField;
    createSpatialField(lat: number, lng: number): SpatialField;
    createField(name: string, value: any, options: CreateFieldOptions): void;
    attachmentsFor(document: any): CapitalizeType<AttachmentName>[];
    loadAttachment(document: any, attachmentName: string): IAttachmentObject;
    loadAttachments(document: any): IAttachmentObject[];
    noTracking: NoTrackingUtils;
}

export interface NoTrackingUtils {
    load<T = any>(documentId: string, collection: string): T;
}

export class StubMapUtils<T> implements IndexingMapUtils {
    load: <T>(documentId: string, collection: string) => T;
    cmpxchg: <T = any>(key: string) => T;
    getMetadata: (document: any) => MetadataObject;
    id: (document: any) => string;
    createSpatialField: (wktOrLat: string | number, lng?: number) => void;
    createField: (name: string, value: any, options?: CreateFieldOptions) => void;
    attachmentsFor: (document: any) => CapitalizeType<AttachmentName>[];
    loadAttachment: (document: any, attachmentName: string) => IAttachmentObject;
    loadAttachments: (document: any) => IAttachmentObject[];
    noTracking: NoTrackingUtils;
}

interface Group<TDocument, TKey> {
    key: TKey;
    values: TDocument[];
}

export class IndexingGroupResults<TDocument> {

    public groupBy<TKey>(selector: KeySelector<TDocument, TKey>): TKey extends void ? never : IndexingReduceResults<TDocument, TKey>;
    public groupBy<TKey>(selector: KeySelector<TDocument, TKey>): IndexingReduceResults<TDocument, TKey> {
        return new IndexingReduceResults<TDocument, TKey>(selector);
    }
}

export class IndexingReduceResults<TDocument, TKey> {

    private _group: KeySelector<TDocument, TKey>;

    constructor(selector: KeySelector<TDocument, TKey>) {
        this._group = selector;
    }

    public aggregate(reducer: IndexingMapDefinition<Group<TDocument, TKey>, TDocument>): IndexingMapReduceFormatter<TDocument> {
        return new IndexingMapReduceFormatter<TDocument>(this._group, reducer);
    }
}

export class IndexingMapReduceFormatter<TDocument> {
    private _groupBy: KeySelector<TDocument, any>;
    private _aggregate: IndexingMapDefinition<Group<TDocument, any>, any>;

    public constructor(groupBy: KeySelector<TDocument, any>, aggregate: IndexingMapDefinition<Group<TDocument, any>, any>) {
        this._groupBy = groupBy;
        this._aggregate = aggregate;
    }

    public format(): string {
        return `groupBy(${this._groupBy}).aggregate(${this._aggregate})`;
    }
}

export type CreatedFieldOptions = {
    storage?: FieldStorage | boolean;
    indexing?: FieldIndexing;
    termVector?: FieldTermVector;
}

export type CreatedField = {
    $value: any;
    $name: string;
    $options: CreatedFieldOptions;
}

export type SpatialField = void;
