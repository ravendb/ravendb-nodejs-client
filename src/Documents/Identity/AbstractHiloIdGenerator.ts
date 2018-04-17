import {IHiloIdGenerator} from "./IHiloIdGenerator";
import {IDocumentStore} from "../../Documents/IDocumentStore";
import {DocumentConventions} from "../../Documents/Conventions/DocumentConventions";
import {IRavenObject} from "../../Types/IRavenObject";
import { getLogger } from "../../Utility/LogUtil";

const log = getLogger({ module: "HiloIdGenerator" });
export abstract class AbstractHiloIdGenerator implements IHiloIdGenerator {
  protected generators: IRavenObject<IHiloIdGenerator> = {};
  protected store: IDocumentStore;
  protected conventions: DocumentConventions;
  protected dbName: string;
  protected tag: string;

  constructor(store: IDocumentStore, dbName?: string, tag?: string) {
    this.tag = tag;
    this.store = store;
    this.conventions = store.conventions;
    this.dbName = dbName || store.database;
  }

  public abstract generateDocumentId(...args: Array<object | string>): Promise<string>;

  public returnUnusedRange(): Promise<void> {

    const returnPromises = Object.keys(this.generators)
      .map(key => {
          return Promise.resolve()
            .then(() => this.generators[key].returnUnusedRange())
            .catch(err => {
              log.warn(err, "Error returning unused range");
            });
      });

    return Promise.all(returnPromises)
      // tslint:disable-next-line:no-empty
      .then(() => {});
  };
}
