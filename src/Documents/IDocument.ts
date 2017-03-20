import {IHash} from '../Utility/Hash';

export type DocumentID = number;
export type DocumentKey = string;

export interface IDocument extends IHash {
   _id: DocumentKey;
}