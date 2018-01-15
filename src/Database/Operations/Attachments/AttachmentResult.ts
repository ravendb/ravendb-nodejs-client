import {IAttachmentDetails} from "./AttachmentDetails";

export interface IAttachmentResult {
  stream: Buffer;
  attachmentDetails: IAttachmentDetails;
}