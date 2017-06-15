/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import * as BluebirdPromise from 'bluebird';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as args from '../args';
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
import {SortOptions} from "../src/Database/Indexes/SortOption";
import {StringUtil} from "../src/Utility/StringUtil";

const defaultUrl: string = StringUtil.format("http://{ravendb-host}:{ravendb-port}", args);
const defaultDatabase: string = "NorthWindTest";
const requestsExecutor: RequestsExecutor = new RequestsExecutor(
  defaultUrl, defaultDatabase, null,
  new DocumentConventions()
);

let indexMap: string;
let index: IndexDefinition;

before(() => {
  chai.use(chaiAsPromised);
});

beforeEach(async function() {
  indexMap = [
    'from doc in docs ',
    'select new{',
    'Tag = doc["@metadata"]["@collection"],',
    'LastModified = (DateTime)doc["@metadata"]["Last-Modified"],',
    'LastModifiedTicks = ((DateTime)doc["@metadata"]["Last-Modified"]).Ticks}'
  ].join('');

  index = new IndexDefinition("Testing", indexMap);
  new PutIndexesCommand(index);

  return requestsExecutor.execute(
    new CreateDatabaseCommand(
      new DatabaseDocument(defaultDatabase, {"Raven/DataDir": "test"})
    )
  )
  .then((): BluebirdPromise.Thenable<IRavenResponse> => requestsExecutor.execute(
    new PutIndexesCommand(index)
  ))
  .then(() => 
    _.assign(this.currentTest, {
      indexDefinition: index,
      indexMap: indexMap,
      requestsExecutor: requestsExecutor,
      defaultUrl: defaultUrl,
      defaultDatabase: defaultDatabase
    })
  );
});

afterEach(async function() {
  ['currentTest', 'indexDefinition', 'indexMap',
   'requestsExecutor', 'defaultUrl', 'defaultDatabase']
   .forEach((key: string) => delete this.currentTest[key]);

  return requestsExecutor
    .execute(new DeleteDatabaseCommand(defaultDatabase, true));
});