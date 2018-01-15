export type AttachmentType = 'Document' | 'Revision';

export class AttachmentTypes {
  public static readonly Document: AttachmentType = 'Document';
  public static readonly Revision: AttachmentType = 'Revision';

  public static isDocument(type: AttachmentType): boolean {
    return type === this.Document;
  }

  public static isRevision(type: AttachmentType): boolean {
    return type === this.Revision;
  }
}