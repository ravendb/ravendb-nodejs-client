/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import * as BluebirdPromise from 'bluebird';
import * as RequestPromise from 'request-promise';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as args from '../args';
import {RequestExecutor} from "../src/Http/Request/RequestExecutor";
import {IndexDefinition} from "../src/Database/Indexes/IndexDefinition";
import {IRavenResponse} from "../src/Database/RavenCommandResponse";
import {DocumentConventions} from "../src/Documents/Conventions/DocumentConventions";
import {CreateDatabaseOperation} from "../src/Database/Operations/CreateDatabaseOperation";
import {DatabaseDocument} from "../src/Database/DatabaseDocument";
import {PutIndexesOperation} from "../src/Database/Operations/PutIndexesOperation";
import {DeleteDatabaseOperation} from "../src/Database/Operations/DeleteDatabaseOperation";
import {StringUtil} from "../src/Utility/StringUtil";
import {IDocumentStore} from "../src/Documents/IDocumentStore";
import {DocumentStore} from "../src/Documents/DocumentStore";

const defaultUrl: string = StringUtil.format("http://{ravendb-host}:{ravendb-port}", args);
const defaultDatabase: string = "NorthWindTest";

let indexMap: string;
let index: IndexDefinition;
let requestExecutor: RequestExecutor;
let store: IDocumentStore;

const waitForDatabaseOperationComplete = async (waitFor: 'create' | 'delete'): Promise<void> => {
  const next = (): BluebirdPromise<void> => BluebirdPromise
    .delay(100).then(() => waitForDatabaseOperationComplete(waitFor));

  return RequestPromise(`${defaultUrl}/topology?name=${defaultDatabase}`)
    .then(() => ('create' === waitFor) ? BluebirdPromise.resolve() : next())
    .catch(() => ('delete' === waitFor) ? BluebirdPromise.resolve() : next())
};

before(() => {
  chai.use(chaiAsPromised);
});

beforeEach(async function() {
  const dbDoc: DatabaseDocument = new DatabaseDocument
    (defaultDatabase, {"Raven/DataDir": "test"});

  store = DocumentStore.create(defaultUrl,  defaultDatabase);  
  store.initialize();

  await store.admin.server.send(new CreateDatabaseOperation(dbDoc));
  await waitForDatabaseOperationComplete('create');

  indexMap = [
    'from doc in docs ',
    'select new{',
    'Tag = doc["@metadata"]["@collection"],',
    'LastModified = (DateTime)doc["@metadata"]["Last-Modified"],',
    'LastModifiedTicks = ((DateTime)doc["@metadata"]["Last-Modified"]).Ticks}'
  ].join('');

  index = new IndexDefinition("Testing", indexMap);
 
  await store.operations.send(new PutIndexesOperation(index));
  requestExecutor = store.getRequestExecutor();

  _.assign(this.currentTest, {
    indexDefinition: index,
    indexMap,
    store,
    requestExecutor,
    defaultUrl,
    defaultDatabase
  });
});

afterEach(async function() {
  ['indexDefinition', 'indexMap',  'defaultUrl', 
    'store', 'requestExecutor', 'defaultDatabase']
   .forEach((key: string) => delete this.currentTest[key]);

  await store.admin.server.send(new DeleteDatabaseOperation(defaultDatabase));  
  await waitForDatabaseOperationComplete('delete');  
});