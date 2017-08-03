import {AdminOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {PutIndexesCommand} from '../Commands/PutIndexesCommand';
import {IndexDefinition} from "../Indexes/IndexDefinition";
import {TypeUtil} from "../../Utility/TypeUtil";

export class PutIndexesOperation extends AdminOperation {
  protected indexes?: IndexDefinition[];

  constructor(indexesToAdd: IndexDefinition | IndexDefinition[], ...moreIndexesToAdd: IndexDefinition[]) {
    let indexes: IndexDefinition[] = TypeUtil.isArray(indexesToAdd)
      ? <IndexDefinition[]>indexesToAdd : [<IndexDefinition>indexesToAdd];

    if (TypeUtil.isArray(moreIndexesToAdd) && moreIndexesToAdd.length) {
      indexes = indexes.concat(moreIndexesToAdd);
    }

    super();
    this.indexes = indexes;
  }
  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new PutIndexesCommand(this.indexes);
  } 
}