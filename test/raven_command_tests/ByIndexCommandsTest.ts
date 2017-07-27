/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird';
import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {IndexFieldOptions} from "../../src/Database/Indexes/IndexFieldOptions";
import {SortOptions} from "../../src/Database/Indexes/SortOption";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {QueryOperationOptions} from "../../src/Database/Operations/QueryOperationOptions";
import {OperationAwaiter} from "../../src/Database/Operations/OperationAwaiter";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {PatchByIndexCommand} from "../../src/Database/Commands/PatchByIndexCommand";
import {DeleteByIndexCommand} from "../../src/Database/Commands/DeleteByIndexCommand";

describe('IndexBasedCommand tests', () => {
  let requestExecutor: RequestExecutor;
  let patch: PatchRequest;
  
  beforeEach(function(): void {
    ({requestExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(async() => {
    const indexMap: string = [
      "from doc in docs.Testings ",
      "select new{",
      "Name = doc.Name,",
      "DocNumber = doc.DocNumber} "
    ].join('');

    const indexSort: IndexDefinition = new IndexDefinition('Testing_Sort', indexMap, null, {
      fields: {
        "DocNumber": new IndexFieldOptions(SortOptions.Numeric)
      }
    });

    patch = new PatchRequest("Name = 'Patched';");
    
    return requestExecutor.execute(new PutIndexesCommand(indexSort))
      .then(() => BluebirdPromise.all(_.range(0, 100).map((i) => requestExecutor
        .execute(new PutDocumentCommand(`testing/${i}`, {
          Name: `test${i}`, DocNumber: i,
          '@metadata': {"@collection": "Testings"}
        }))
      )));
  });


  describe('Actions by Index', () => {
    it('update by index success', async () => {
      const indexQuery: IndexQuery = new IndexQuery('Name:*', 0, 0, null, {wait_for_non_stale_results: true});
      const queryCommand: QueryCommand = new QueryCommand('Testing_Sort', indexQuery, new DocumentConventions());
      const patchByIndexCommand: PatchByIndexCommand = new PatchByIndexCommand('Testing_Sort', new IndexQuery('Name:*'), patch, new QueryOperationOptions(false));

      return requestExecutor
        .execute(queryCommand)
        .then(() => requestExecutor
        .execute(patchByIndexCommand)
        .then((response: IRavenResponse) => {
          const awaiter: OperationAwaiter = new OperationAwaiter(requestExecutor, response.OperationId);

          return awaiter.waitForCompletion();
        })
        .then((response: IRavenResponse) => {
          expect(response).not.to.be.null;
          expect((response as IRavenResponse).Result.Total).not.to.be.lessThan(50);
        })
      );
    });

    it('update by index fail', async () => expect(
      requestExecutor
        .execute(new PatchByIndexCommand('', new IndexQuery('Name:test'), patch))
        .then((response: IRavenResponse) => {
          const awaiter: OperationAwaiter = new OperationAwaiter(requestExecutor, response.OperationId);

          return awaiter.waitForCompletion();
        })
      ).to.be.rejected
    );

    it('delete by index fail', async () => expect(
      requestExecutor
        .execute(new DeleteByIndexCommand('region2', new IndexQuery('Name:Western')))
        .then((response: IRavenResponse) => {
          const awaiter: OperationAwaiter = new OperationAwaiter(requestExecutor, response.OperationId);

          return awaiter.waitForCompletion();
        })
      ).to.be.rejected
    );

    it('delete by index success', async () => {
      const query: string = 'DocNumber_D_Range:[0 TO 49]';
      const indexQuery: IndexQuery = new IndexQuery(query, 0, 0, null, {wait_for_non_stale_results: true});
      const queryCommand: QueryCommand = new QueryCommand('Testing_Sort', indexQuery, new DocumentConventions());
      const deleteByIndexCommand: DeleteByIndexCommand = new DeleteByIndexCommand('Testing_Sort', new IndexQuery(query), new QueryOperationOptions(false));

      return requestExecutor
        .execute(queryCommand)
        .then(() => requestExecutor
        .execute(deleteByIndexCommand))
        .then((response: IRavenResponse) => {
          const awaiter: OperationAwaiter = new OperationAwaiter(requestExecutor, response.OperationId);

          return awaiter.waitForCompletion();
        })
        .then((response: IRavenResponse) => expect(response.Status).to.equals('Completed'));
    });
  });
});
