import {AttachmentOperation} from './AttachmentOperation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {AttachmentType} from './Attachments/AttachmentType';
import {DeleteAttachmentCommand} from '../Commands/DeleteAttachmentCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';

export class DeleteAttachmentOperation extends AttachmentOperation {  
  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new DeleteAttachmentCommand(this.documentId, this.name, this.changeVector);
  } 
}