import {IDocument} from './IDocument'

export type DocumentCallback<T extends IDocument> = (entity?: T, error?: Error) => void;
export type DocumentQueryCallback<T extends IDocument> = (entities?: T[], error?: Error) => void;
export type DocumentCountQueryCallback = (entitiesCount?: number, error?: Error) => void;