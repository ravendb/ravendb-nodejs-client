/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as args from '../args';
import * as uuid from 'uuid';
import {RequestExecutor} from "../src/Http/Request/RequestExecutor";
import {IndexDefinition} from "../src/Database/Indexes/IndexDefinition";
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
let currentDatabase: string;

before(() => {
  chai.use(chaiAsPromised);
});

beforeEach(async function() {
  currentDatabase = `${defaultDatabase}__${uuid()}`;

  const dbDoc: DatabaseDocument = new DatabaseDocument
    (currentDatabase, {"Raven/DataDir": "test"});

  store = DocumentStore.create(defaultUrl,  currentDatabase);
  store.initialize();

  await store.maintenance.server.send(new CreateDatabaseOperation(dbDoc));

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
    currentDatabase
  });
});

afterEach(async function() {
   await store.maintenance.server.send(new DeleteDatabaseOperation(currentDatabase, true, null, 10000));
   await store.dispose();

   ['indexDefinition', 'indexMap',  'defaultUrl',
   'store', 'requestExecutor', 'currentDatabase']
      .forEach((key: string) => delete this.currentTest[key]);
});
