/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import * as BluebirdPromise from "bluebird";
import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('QueryCommand Tests', () => {
  let requestExecutor: RequestExecutor;
  const query: string = "from index 'Testing' where Tag = 'Products'";
  const conventions: DocumentConventions = new DocumentConventions();
  const indexQuery: IndexQuery = new IndexQuery(query, null, 0, {}, {waitForNonStaleResults: true, waitForNonStaleResultsAsOfNow: true});

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
      .execute(new QueryCommand(indexQuery, conventions))
      .then((result: IRavenResponse) => expect(result.Results[0]).to.have.property('Name', 'test'))
    );

    it('should query only metadata', async () => requestExecutor
      .execute(new QueryCommand(indexQuery, conventions, true))
      .then((result: IRavenResponse) => expect(result.Results[0]).not.to.have.property('Name'))
    );

    it('should query only documents', async () => requestExecutor
      .execute(new QueryCommand(indexQuery, conventions, false, true))
      .then((result: IRavenResponse) => expect(result.Results[0]).not.to.have.property('@metadata'))
    );

    it('should fail with non-existing index', async () => expect(
        requestExecutor.execute(new QueryCommand(new IndexQuery("from index 'IndexIsNotExists'"), conventions))
      ).to.be.rejected
    );
  });
});

