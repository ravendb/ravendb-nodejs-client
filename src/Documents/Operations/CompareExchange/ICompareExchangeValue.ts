import { IMetadataDictionary } from "../../..";

export interface ICompareExchangeValue {
    key: string;
    index: number;
    value: any;
    metadata: IMetadataDictionary;
    hasMetadata(): boolean;
}
