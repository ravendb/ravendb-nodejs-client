import { CountersIndexDefinition } from "./CountersIndexDefinition";
import { AbstractIndexDefinitionBuilder } from "../AbstractIndexDefinitionBuilder";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class CountersIndexDefinitionBuilder extends AbstractIndexDefinitionBuilder<CountersIndexDefinition> {
    public map: string;

    public constructor(indexName?: string) {
        super(indexName);
    }

    protected _newIndexDefinition(): CountersIndexDefinition {
        return new CountersIndexDefinition();
    }

    toIndexDefinition(conventions: DocumentConventions, validateMap: boolean = true): CountersIndexDefinition {
        if (!this.map && validateMap) {
            throwError("InvalidArgumentException",
                "Map is required to generate an index, you cannot create an index without a valid Map property (in index " + this._indexName + ").");
        }
        return super.toIndexDefinition(conventions, validateMap);
    }

    protected _toIndexDefinition(indexDefinition: CountersIndexDefinition, conventions: DocumentConventions) {
        if (!this.map) {
            return;
        }

        indexDefinition.maps.add(this.map);
    }
}
