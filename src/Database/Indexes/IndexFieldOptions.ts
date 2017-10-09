import {FieldIndexingOptions} from "./FieldIndexingOption";
import {FieldTermVectorOption} from "./FieldTermVectorOption";
import {IJsonable} from '../../Typedef/Contracts';

export class IndexFieldOptions implements IJsonable {
  protected indexing?: FieldIndexingOptions = null;
  protected storage?: boolean = null;
  protected termVector?: FieldTermVectorOption = null;
  protected suggestions?: boolean = null;
  protected analyzer?: string = null;

  constructor(indexing?: FieldIndexingOptions, storage?: boolean,
    suggestions?: boolean, termVector?: FieldTermVectorOption, analyzer?: string
  ) {
    this.indexing = indexing;
    this.storage = storage;
    this.suggestions = suggestions;
    this.termVector = termVector;
    this.analyzer = analyzer;
  }

  public toJson(): object {
    const indexingJson: string = this.indexing ? (this.indexing as string) : null;
    const termVectorJson: string = this.termVector ? (this.termVector as string) : null;
    const storageJson: string = (this.storage !== null) ? ((this.storage as boolean) ? 'Yes' : 'No') : null;

    return {
      "Analyzer": this.analyzer,
      "Indexing": indexingJson,
      "Spatial": null,
      "Storage": storageJson,
      "Suggestions": this.suggestions,
      "TermVector": termVectorJson
    };
  }
}