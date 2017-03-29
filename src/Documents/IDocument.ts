import {IHash} from '../Utility/Hash';
import {IMetadata} from "../Database/Metadata";

export type DocumentID = number;
export type DocumentKey = string;
export type IDocumentType = string;

export type DocumentConstructor<T extends IDocument> = { new(attributes?: Object, metadata?: IMetadata): T; };

export interface IDocument extends IHash {
   id: DocumentKey;
}