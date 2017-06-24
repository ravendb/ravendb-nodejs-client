/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import * as BluebirdPromise from "bluebird";
import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {QueryOperators} from "../../src/Documents/Session/QueryOperator";

describe('DocumentSession', () => {
  const tag: string = 'Tag:Products';
  const indexName: string = 'Testing';
  let requestExecutor: RequestExecutor;
  const conventions: DocumentConventions = new DocumentConventions();

  const indexQuery = (): IndexQuery => new IndexQuery(
    tag, 128, 0, QueryOperators.OR, 
    {wait_for_non_stale_results: true}
  );

  beforeEach(function(): void {
    ({requestExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => requestExecutor
      .execute(new PutDocumentCommand('Products/10', {
        "Name": "test", 
        '@metadata': {
          'Raven-Node-Type': 'Product', 
          '@collection': 'Products'
        }
      }))
  );

  describe('Query Command', () => {
    it('should do query', async () => requestExecutor
      .execute(new QueryCommand(indexName, indexQuery(), conventions))
      .then((result: IRavenResponse) => expect(result.Results[0]).to.have.property('Name', 'test'))
    );

    it('should query only metadata', async () => requestExecutor
      .execute(new QueryCommand(indexName, indexQuery(), conventions, null, true))
      .then((result: IRavenResponse) => expect(result.Results[0]).not.to.have.property('Name'))
    );

    it('should query only documents', async () => requestExecutor
      .execute(new QueryCommand(indexName, indexQuery(), conventions, null, null, true))
      .then((result: IRavenResponse) => expect(result.Results[0]).not.to.have.property('@metadata'))
    );

    it('should fail with null index', async () => expect(() =>
        requestExecutor.execute(new QueryCommand(null, new IndexQuery(tag), conventions))
      ).to.throw
    );

    it('should fail with no existing index', async () => expect(
        requestExecutor.execute(new QueryCommand('IndexIsNotExists', new IndexQuery(tag), conventions))
      ).to.be.rejected
    );
  });
});

