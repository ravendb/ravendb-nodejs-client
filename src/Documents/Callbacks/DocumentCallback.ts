import {IDocument} from '../IDocument'

export type DocumentCallback<T extends IDocument> = (entity?: T, error?: Error) => void;