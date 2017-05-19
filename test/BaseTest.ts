/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import * as BluebirdPromise from 'bluebird';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {RequestsExecutor} from "../src/Http/Request/RequestsExecutor";
import {IndexDefinition} from "../src/Database/Indexes/IndexDefinition";
import {DocumentConventions} from "../src/Documents/Conventions/DocumentConventions";
import {CreateDatabaseCommand} from "../src/Database/Commands/CreateDatabaseCommand";
import {DatabaseDocument} from "../src/Database/DatabaseDocument";
import {IRavenResponse} from "../src/Database/RavenCommandResponse";
import {PutIndexesCommand} from "../src/Database/Commands/PutIndexesCommand";
import {DeleteDatabaseCommand} from "../src/Database/Commands/DeleteDatabaseCommand";

const defaultUrl: string = "http://localhost.fiddler:8080";
const defaultDatabase: string = "NorthWindTest";
let requestsExecutor: RequestsExecutor;
let indexMap: string;
let index: IndexDefinition;

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