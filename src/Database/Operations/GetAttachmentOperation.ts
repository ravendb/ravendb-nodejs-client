import {AttachmentOperation} from './AttachmentOperation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {AttachmentType} from './Attachments/AttachmentType';
import {GetAttachmentCommand} from '../Commands/GetAttachmentCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';

export class GetAttachmentOperation extends AttachmentOperation {  
  protected type: AttachmentType;

  constructor(documentId: string, name: string, type: AttachmentType, changeVector?: string) {
    super(documentId, name, changeVector);
    this.type = type;
  }

  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new GetAttachmentCommand(this.documentId, this.name, this.type, this.changeVector);
  } 
}