export type DocumentID = number;
export type DocumentKey = string;

export interface IDocument {
   _id: DocumentKey;
   [propName: string]: any | any[];
}