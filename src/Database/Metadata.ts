export interface IMetadata {
  [property: string]: any | any[];
}

export class Metadata extends Object implements IMetadata {
  [property: string]: any | any[];
}