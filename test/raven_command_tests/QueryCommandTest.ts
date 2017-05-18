/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {DocumentQuery} from "../../src/Documents/Session/DocumentQuery";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('DocumentSession', () => {
  const tag = 'Tag:Products';
  let requestsExecutor: RequestsExecutor;
  let indexDefinition: IndexDefinition;
  const conventions: DocumentConventions = new DocumentConventions();

  beforeEach(function(): void {
    ({requestsExecutor, indexDefinition} = this.currentTest as IRavenObject);
  });

  beforeEach((done: MochaDone) => {
    const metadata: object = {'Raven-Node-Type': 'Document', '@collection': 'Products', 'object_type': 'product'};

    requestsExecutor.execute(new PutDocumentCommand('products/10', {"Name": "test", '@metadata': metadata})).then(() => done());
  });

  describe('Query Command', () => {
    it('should do only query', (done: MochaDone) => {
      requestsExecutor
        .execute(new PutIndexesCommand(indexDefinition))
        .then(() => requestsExecutor.execute(new QueryCommand('Testing', new IndexQuery(tag), conventions)))
        .then((result: IRavenResponse) => {
          expect(result.Results[0]["Name"]).to.equals('test');
          done()
        });
    });

    it('should get only metadata', (done: MochaDone) => {
      requestsExecutor
        .execute(new PutIndexesCommand(indexDefinition))
        .then(() => requestsExecutor.execute(new QueryCommand('Testing', new IndexQuery(tag), conventions, null, true)))
        .then((result: IRavenResponse) => {
          expect(result.Results[0]).not.to.include('Name');
          done()
        });
    });

    it('should get only index entries', (done: MochaDone) => {
      requestsExecutor
        .execute(new PutIndexesCommand(indexDefinition))
        .then(() => requestsExecutor.execute(new QueryCommand('Testing', new IndexQuery(tag), conventions, null, null, true)))
        .then((result: IRavenResponse) => {
          expect(result.Results[0]).not.to.include('@metadata');
          done()
        });
    });

    it('should fail with null index', (done: MochaDone) => {
      expect(requestsExecutor.execute(new QueryCommand(null, new IndexQuery(tag), conventions))).should.be.rejected.and.notify(done)
    });

    it('should fail with no existing index', (done: MochaDone) => {
      expect(requestsExecutor.execute(new QueryCommand('IndexIsNotExists', new IndexQuery(tag), conventions))).should.be.rejected.and.notify(done)
    });
  });
});

