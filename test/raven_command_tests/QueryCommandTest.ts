/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import * as BluebirdPromise from "bluebird";
import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('DocumentSession', () => {
  const tag: string = 'Tag:Products';
  const indexName: string = 'Testing';
  let requestsExecutor: RequestsExecutor;
  const conventions: DocumentConventions = new DocumentConventions();

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => requestsExecutor
      .execute(new PutDocumentCommand('Products/10', {
        "Name": "test", 
        '@metadata': {
          'Raven-Node-Type': 'Product', 
          '@collection': 'Products'
        }
      }))
  );

  describe('Query Command', () => {
    it('should do query', async () => BluebirdPromise.delay(1000)
      .then(() => requestsExecutor.execute(new QueryCommand(indexName, new IndexQuery(tag), conventions))
      .then((result: IRavenResponse) => expect(result.Results[0]).to.have.property('Name', 'test'))
      .then(() => requestsExecutor.execute(new QueryCommand(indexName, new IndexQuery(tag), conventions, null, true)))
      .then((result: IRavenResponse) => expect(result.Results[0]).not.to.have.property('Name'))
      .then(() => requestsExecutor.execute(new QueryCommand(indexName, new IndexQuery(tag), conventions, null, null, true)))
      .then((result: IRavenResponse) => expect(result.Results[0]).not.to.have.property('@metadata')))
    );

    it('should fail with null index', async () => expect(() =>
        requestsExecutor.execute(new QueryCommand(null, new IndexQuery(tag), conventions))
      ).to.throw
    );

    it('should fail with no existing index', async () => expect(
        requestsExecutor.execute(new QueryCommand('IndexIsNotExists', new IndexQuery(tag), conventions))
      ).to.be.rejected
    );
  });
});

