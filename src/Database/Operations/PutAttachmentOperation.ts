import {AttachmentOperation} from './AttachmentOperation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {AttachmentType} from './Attachments/AttachmentType';
import {PutAttachmentCommand} from '../Commands/PutAttachmentCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';

export class PutAttachmentOperation extends AttachmentOperation {  
  protected stream: Buffer;
  protected contentType?: string;

  constructor(documentId: string, name: string, stream: Buffer, contentType?: string, changeVector?: string) {
    super(documentId, name, changeVector);
    this.stream = stream;
    this.contentType = contentType;
  }

  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new PutAttachmentCommand(this.documentId, this.name, this.stream, this.contentType, this.changeVector);
  } 
}