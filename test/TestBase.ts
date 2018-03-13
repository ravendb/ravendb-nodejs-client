/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as args from '../args';
import * as uuid from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import {RequestExecutor} from "../src/Http/Request/RequestExecutor";
import {IndexDefinition} from "../src/Database/Indexes/IndexDefinition";
import {CreateDatabaseOperation} from "../src/Database/Operations/CreateDatabaseOperation";
import {DatabaseDocument} from "../src/Database/DatabaseDocument";
import {PutIndexesOperation} from "../src/Database/Operations/PutIndexesOperation";
import {DeleteDatabaseOperation} from "../src/Database/Operations/DeleteDatabaseOperation";
import {StringUtil} from "../src/Utility/StringUtil";
import {IDocumentStore} from "../src/Documents/IDocumentStore";
import {DocumentStore} from "../src/Documents/DocumentStore";
import {CertificateType, Certificate} from "../src/Auth/Certificate";
import {IStoreAuthOptions} from "../src/Auth/AuthOptions";

const certificateFile: string = args['ravendb-certificate'];
const defaultDatabase: string = "NorthWindTest";
const defaultUrl: string = StringUtil.format(
  "{protocol}://{ravendb-host}:{ravendb-port}", {
    ...args, protocol: !certificateFile
      ? 'http' : 'https'
  }
);

const authOptCa = args.ca ? fs.readFileSync(args.ca, { encoding: 'ascii' }) : null;
(global as any).IS_TESTING_SECURE_SERVER = !!certificateFile;
(global as any).EXTRA_CA = authOptCa;

let indexMap: string;
let index: IndexDefinition;
let requestExecutor: RequestExecutor;
let store: IDocumentStore;
let currentDatabase: string;
let certificate: string | Buffer = null;
let certificateType: CertificateType = null;

if (certificateFile) {
  switch (path.extname(certificateFile)
    .toLowerCase().substring(1)
  ) {
    case 'pem':
      certificateType = Certificate.Pem;
      break;
    case 'pfx':
      certificateType = Certificate.Pfx;
      break;
  }  

  if (certificateType) {
    certificate = fs.readFileSync(certificateFile);
  }
}

before(() => {
  chai.use(chaiAsPromised);
});

beforeEach(async function() {
  currentDatabase = `${defaultDatabase}__${uuid()}`;

  let authOptions: IStoreAuthOptions = null;
  const dbDoc: DatabaseDocument = new DatabaseDocument
    (currentDatabase, {"Raven/DataDir": "test"});

  if (certificate) {
    authOptions = {
      type: certificateType,
      certificate,
      ca: authOptCa 
    };
  }  

  store = DocumentStore.create(defaultUrl,  currentDatabase, authOptions);
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
