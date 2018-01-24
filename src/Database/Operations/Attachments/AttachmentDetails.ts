export interface IAttachmentName {
  name: string;
  hash: string;
  contentType: string;
  size: number;
}

export interface IAttachmentDetails extends IAttachmentName {
  changeVector: string;
  documentId: string;
}