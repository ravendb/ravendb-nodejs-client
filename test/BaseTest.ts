/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import * as BluebirdPromise from 'bluebird';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {RequestsExecutor} from "../src/Http/Request/RequestsExecutor";
import {IndexDefinition} from "../src/Database/Indexes/IndexDefinition";
import {FieldIndexingOptions} from "../src/Database/Indexes/FieldIndexingOption";
import {IRavenResponse} from "../src/Database/RavenCommandResponse";
import {IndexFieldOptions} from "../src/Database/Indexes/IndexFieldOptions";
import {DocumentConventions} from "../src/Documents/Conventions/DocumentConventions";
import {CreateDatabaseCommand} from "../src/Database/Commands/CreateDatabaseCommand";
import {DatabaseDocument} from "../src/Database/DatabaseDocument";
import {IRavenObject} from "../src/Database/IRavenObject";
import {PutIndexesCommand} from "../src/Database/Commands/PutIndexesCommand";
import {DeleteDatabaseCommand} from "../src/Database/Commands/DeleteDatabaseCommand";

const defaultUrl: string = "http://localhost.fiddler:8080";
const defaultDatabase: string = "NorthWindTest";
let requestsExecutor: RequestsExecutor;
let indexMap: string;
let index: IndexDefinition;

export class Foo implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public order: number = 0   
  ) {}        
}

export class Product implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public order?: string 
  ) {}
}

export class Company implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public product?: Product
  ) {}
}

export class Order implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public key?: string | number,
    public product_id?: string
  ) {}
}

export class LastFm implements IRavenObject {
  constructor(
    public id?: string,
    public artist: string = "",
    public track_id: string = "",
    public title: string = "",
    public datetime_time: Date = new Date(),
    public tags: string[] = [] 
  ) {}
}

export class LastFmAnalyzed {
  protected indexDefinition: IndexDefinition;

  constructor(
    protected executor: RequestsExecutor
  ) {
    const indexMap: string = [
      "from song in docs.LastFms ",
      "select new {",
      "query = new object[] {",
      "song.artist,",
      "((object)song.datetime_time),",
      "song.tags,",
      "song.title,",
      "song.track_id}}"
    ].join('');

    this.indexDefinition = new IndexDefinition(
      this.constructor.name, indexMap, null, {
      fields: {
        "query": new IndexFieldOptions(null, FieldIndexingOptions.Analyzed)
      }
    });
  }

  public async execute(): Promise<IRavenResponse | IRavenResponse[] | void> {
     return this.executor.execute(new PutIndexesCommand(this.indexDefinition)); 
  }
}
    
before(() => {
  chai.use(chaiAsPromised);
});

beforeEach(function(done: MochaDone): void {
  requestsExecutor = new RequestsExecutor(
    defaultUrl, defaultDatabase, null,
    new DocumentConventions()
  );

  indexMap = [
    'from doc in docs ',
    'select new{',
    'Tag = doc["@metadata"]["@collection"],',
    'LastModified = (DateTime)doc["@metadata"]["Last-Modified"],',
    'LastModifiedTicks = ((DateTime)doc["@metadata"]["Last-Modified"]).Ticks}'
  ].join('');

  index = new IndexDefinition("Testing", indexMap);

  requestsExecutor.execute(
    new CreateDatabaseCommand(
      new DatabaseDocument(defaultDatabase, {"Raven/DataDir": "test"})
    )
  )
  .then((): BluebirdPromise.Thenable<IRavenResponse> => requestsExecutor.execute(
    new PutIndexesCommand(index)
  ))
  .then((): void => {
    _.assign(this.currentTest, {
      indexDefinition: index,
      indexMap: indexMap,
      requestsExecutor: requestsExecutor,
      defaultUrl: defaultUrl,
      defaultDatabase: defaultDatabase
    });

    done();
  });
});

afterEach(function(done: MochaDone): void {
  ['currentTest', 'indexDefinition', 'indexMap',
   'requestsExecutor', 'defaultUrl', 'defaultDatabase']
   .forEach((key: string) => delete this.currentTest[key]);

  requestsExecutor
    .execute(new DeleteDatabaseCommand(defaultDatabase, true))
    .then((): void => done());
});