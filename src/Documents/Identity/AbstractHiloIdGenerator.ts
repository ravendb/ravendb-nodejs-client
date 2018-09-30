import {IHiloIdGenerator} from "./IHiloIdGenerator";
import {IDocumentStore} from "../../Documents/IDocumentStore";
import {DocumentConventions} from "../../Documents/Conventions/DocumentConventions";
import {IRavenObject} from "../../Types/IRavenObject";
import { getLogger } from "../../Utility/LogUtil";

const log = getLogger({module: "HiloIdGenerator"});

export abstract class AbstractHiloIdGenerator {
    protected _generators: IRavenObject<IHiloIdGenerator> = {};
    protected _store: IDocumentStore;
    protected _conventions: DocumentConventions;
    protected _dbName: string;
    protected _tag: string;

    protected constructor(store: IDocumentStore, dbName?: string, tag?: string) {
        this._tag = tag;
        this._store = store;
        this._conventions = store.conventions;
        this._dbName = dbName || store.database;
    }

    public returnUnusedRange(): Promise<void> {

        const returnPromises = Object.keys(this._generators)
            .map(key => {
                return Promise.resolve()
                    .then(() => this._generators[key].returnUnusedRange())
                    .catch(err => {
                        log.warn(err, "Error returning unused range");
                    });
            });

        return Promise.all(returnPromises)
            // tslint:disable-next-line:no-empty
            .then(() => {
            });
    }
}
