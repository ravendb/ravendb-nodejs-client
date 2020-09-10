import { Size } from "../../Utility/SizeUtil";

export interface CollectionDetails {
    name: string;
    countOfDocuments: number;
    size: Size; //TODO: check bindings
}
