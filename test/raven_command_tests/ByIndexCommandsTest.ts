/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import * as _ from 'lodash';
import * as Promise from 'bluebird';
import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {IRavenResponse, IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {IndexFieldOptions} from "../../src/Database/Indexes/IndexFieldOptions";
import {SortOptions} from "../../src/Database/Indexes/SortOption";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {QueryOperationOptions} from "../../src/Database/Operations/QueryOperationOptions";
import {Operations} from "../../src/Database/Operations/Operations";
import {IHash} from "../../src/Utility/Hash";
import {IDocument} from "../../src/Documents/IDocument";
import {Document} from "../../src/Documents/Document";
import {PatchByIndexCommand} from "../../src/Database/Commands/PatchByIndexCommand";
import {DeleteByIndexCommand} from "../../src/Database/Commands/DeleteByIndexCommand";

describe('DocumentSession', () => {
  let requestsExecutor: RequestsExecutor;
  let patch: PatchRequest;
  let operations: Operations;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IHash);
  });

  before((done: MochaDone) => {
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
    operations = new Operations(requestsExecutor);

    requestsExecutor.execute(new PutIndexesCommand(indexSort))
      .then(() => Promise.all(_.range(0, 100).map((i) => requestsExecutor
        .execute(new PutDocumentCommand(`testing/${i}`, {
          Name: `test${i}`, DocNumber: i,
          '@metadata': {"@collection": "Testings"}
        }))
      )))
      .then(() => done());
  });


  describe('Actions by Index', () => {
    it('update by index success', (done: MochaDone) => {
      const indexQuery: IndexQuery = new IndexQuery('Name:*', 0, 0, null, {wait_for_non_stale_results: true});
      const queryCommand: QueryCommand = new QueryCommand('Testing_Sort', indexQuery, new DocumentConventions<IDocument>(Document));
      const patchByIndexCommand: PatchByIndexCommand = new PatchByIndexCommand('Testing_Sort', new IndexQuery('Name:*'), patch, new QueryOperationOptions(false));

      requestsExecutor
        .execute(queryCommand)
        .then(() => requestsExecutor
        .execute(patchByIndexCommand)
        .then((response: IRavenResponse) => operations
        .waitForOperationComplete((response as IRavenResponse).OperationId))
        .then((response: IRavenResponse) => {
          expect(response).not.to.be.null;
          expect((response as IRavenResponse).Result.Total).not.to.be.lessThan(50);
          done();
        })
      );
    });

    it ('update by index fail', (done: MochaDone) => {
      expect(
        requestsExecutor
          .execute(new PatchByIndexCommand('', new IndexQuery('Name:test'), patch))
          .then((response: IRavenResponse) =>  operations
          .waitForOperationComplete((response as IRavenResponse).OperationId))
      ).to.be.rejected.and.notify(done);
    });

    it ('delete by index fail', (done: MochaDone) => {
      expect(
        requestsExecutor
          .execute(new DeleteByIndexCommand('region2', new IndexQuery('Name:Western')))
          .then((response: IRavenResponse) =>  operations
          .waitForOperationComplete((response as IRavenResponse).OperationId))
      ).to.be.rejected.and.notify(done)
    });

    it('delete by index success', (done: MochaDone) => {
      const query: string = 'DocNumber_D_Range:[0 TO 49]';
      const indexQuery: IndexQuery = new IndexQuery(query, 0, 0, null, {wait_for_non_stale_results: true});
      const queryCommand: QueryCommand = new QueryCommand('Testing_Sort', indexQuery, new DocumentConventions<IDocument>(Document));
      const deleteByIndexCommand: DeleteByIndexCommand = new DeleteByIndexCommand('Testing_Sort', new IndexQuery(query), new QueryOperationOptions(false));

      requestsExecutor
        .execute(queryCommand)
        .then(() => requestsExecutor
        .execute(deleteByIndexCommand))
        .then((response: IRavenResponse) => operations
        .waitForOperationComplete((response as IRavenResponse).OperationId))
        .then((response: IRavenResponse) => {
          expect((response as IRavenResponse).Status).to.equals('Completed');
          done();
        });
    });
  });
});
