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
import {PutIndexesOperation} from "../../src/Database/Operations/PutIndexesOperation";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {QueryOperationOptions} from "../../src/Database/Operations/QueryOperationOptions";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {PatchByQueryOperation} from "../../src/Database/Operations/PatchByQueryOperation";
import {DeleteByIndexOperation} from "../../src/Database/Operations/DeleteByIndexOperation";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";

describe('IndexBasedCommand tests', () => {
  let requestExecutor: RequestExecutor;
  let patch: PatchRequest;
  let store: IDocumentStore;
  let query;

  beforeEach(function (): void {
    ({requestExecutor, store} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => {
    const indexMap: string = [
      "from doc in docs.Testings ",
      "select new{",
      "Name = doc.Name,",
      "DocNumber = doc.DocNumber} "
    ].join('');

    const indexSort: IndexDefinition = new IndexDefinition('Order', indexMap, null, {
      fields: {
        "DocNumber": new IndexFieldOptions(SortOptions.Numeric)
      }
    });

    patch = new PatchRequest("Name = 'Patched';");
    query = `from index 'Order' where exists(Name)`;

    return store.operations.send(new PutIndexesOperation(indexSort))
      .then(() => BluebirdPromise.all(_.range(0, 1).map((i) => requestExecutor
        .execute(new PutDocumentCommand(`testing`, {
          Name: `test`, DocNumber: i,
          '@metadata': {"@collection": "Testings"}
        }))
      )));


  });


  describe('Actions by Index', () => {

    it('update by index success', async () => {
      const indexQuery: IndexQuery = new IndexQuery(query, 0, 0, {WaitForNonStaleResults: true});
      const queryCommand: QueryCommand = new QueryCommand(indexQuery, new DocumentConventions());
      const PatchByQueryOperations: PatchByQueryOperation = new PatchByQueryOperation(new IndexQuery(query), patch, new QueryOperationOptions(false));

      return requestExecutor
        .execute(queryCommand)
        .then(() => store.operations
          .send(PatchByQueryOperations)
          .then((response: IRavenResponse) => {
            expect(response).not.to.be.null;
            expect((response as IRavenResponse).Result.Total).not.to.be.lessThan(1);
          })
        );
    });

      it('update by index fail', async () => expect(
        store.operations
          .send(new PatchByQueryOperation(new IndexQuery(`from index 'unexisting_index_1' where Name = 'test1'`), patch))
        ).to.be.rejected
      );

      it('delete by index fail', async () => expect(
        store.operations
          .send(new DeleteByIndexOperation(new IndexQuery(`from index 'unexisting_index_1' where Name = 'test1'`)))
        ).to.be.rejected
      );

      it('delete by index success', async () => {
        const query: string = "from index 'Order' where DocNumber between 0 AND 47";
        const indexQuery: IndexQuery = new IndexQuery(query, 0, 0, {wait_for_non_stale_results: true});
        const queryCommand: QueryCommand = new QueryCommand(indexQuery, new DocumentConventions());
        const deleteByIndexOperations: DeleteByIndexOperation = new DeleteByIndexOperation(new IndexQuery(query), new QueryOperationOptions(false));

        return requestExecutor
          .execute(queryCommand)
          .then(() => store.operations
            .send(deleteByIndexOperations))
          .then((response: IRavenResponse) => expect(response.Status).to.equals('Completed'));
      });

    });


  });
