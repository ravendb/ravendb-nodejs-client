import {Operation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {AttachmentType} from './Attachments/AttachmentType';

export abstract class AttachmentOperation extends Operation {  
  protected documentId: string;
  protected name: string;
  protected changeVector?: string;

  constructor(documentId: string, name: string, changeVector?: string) {
    super();
    this.documentId = documentId;
    this.name = name;
    this.changeVector = changeVector;
  }
}