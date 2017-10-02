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
import {PutIndexesOperation} from "../../src/Database/Operations/PutIndexesOperation";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {QueryOperationOptions} from "../../src/Database/Operations/QueryOperationOptions";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {PatchByQueryOperation} from "../../src/Database/Operations/PatchByQueryOperation";
import {DeleteByQueryOperation} from "../../src/Database/Operations/DeleteByQueryOperation";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";

describe('IndexBasedCommand tests', () => {
  let requestExecutor: RequestExecutor;
  let store: IDocumentStore;

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

    const indexSort: IndexDefinition = new IndexDefinition('Testing_Sort', indexMap);

    return store.operations.send(new PutIndexesOperation(indexSort))
      .then(() => BluebirdPromise.all(_.range(0, 100)
      .map((i: number): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> => requestExecutor
      .execute(new PutDocumentCommand(`testing/${i}`, {
          Name: `test${i}`, DocNumber: i,
          '@metadata': {"@collection": "Testings"}
      })))));
  });

  describe('Actions by Index', () => {
    it('update by index success', async () => {
      const query: string = "from index 'Testing_Sort' where exists(Name) update { this.Name = args.name; }";
      const indexQuery: IndexQuery = new IndexQuery(query, {name: 'Patched'}, null, 0, {waitForNonStaleResults: true});
      const patchByQueryOperation: PatchByQueryOperation = new PatchByQueryOperation(indexQuery, new QueryOperationOptions(false));

      return store.operations
        .send(patchByQueryOperation)
        .then((response: IRavenResponse) => {
          expect(response).not.to.be.null;
          expect((response as IRavenResponse).Result.Total).not.to.be.lessThan(100);
        });
    });

    it('update by index fail', async () => expect(
      store.operations
        .send(new PatchByQueryOperation(new IndexQuery(`from index 'unexisting_index_1' where Name = 'test1' update { this.Name = args.name; }`, {name: 'Patched'})))
      ).to.be.rejected
    );

    it('delete by index fail', async () => expect(
      store.operations
        .send(new DeleteByQueryOperation(new IndexQuery(`from index 'unexisting_index_1' where Name = 'test1'`)))
      ).to.be.rejected
    );

    it('delete by index success', async () => {
      const query: string = "from index 'Testing_Sort' where DocNumber between 0 AND 49";
      const indexQuery: IndexQuery = new IndexQuery(query, {}, null, 0, {waitForNonStaleResults: true});
      const deleteByIndexOperations: DeleteByQueryOperation = new DeleteByQueryOperation(indexQuery, new QueryOperationOptions(false));

      return store.operations
        .send(deleteByIndexOperations)
        .then((response: IRavenResponse) => expect(response.Status).to.equals('Completed'));
    });
  });
});