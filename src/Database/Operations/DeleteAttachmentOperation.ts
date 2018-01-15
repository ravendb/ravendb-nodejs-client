import {AttachmentOperation} from './AttachmentOperation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {AttachmentType} from './Attachments/AttachmentType';
import {DeleteAttachmentCommand} from '../Commands/DeleteAttachmentCommand';

export class DeleteAttachmentOperation extends AttachmentOperation {  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new DeleteAttachmentCommand(this.documentId, this.name, this.changeVector);
  } 
}