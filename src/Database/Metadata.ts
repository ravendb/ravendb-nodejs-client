import {IHash, Hash} from '../Utility/Hash';

export interface IMetadata extends IHash {

}

export class Metadata extends Hash implements IMetadata {

}