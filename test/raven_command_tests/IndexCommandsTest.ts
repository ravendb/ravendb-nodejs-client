/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {GetIndexCommand} from "../../src/Database/Commands/GetIndexCommand";
import {DeleteIndexCommand} from "../../src/Database/Commands/DeleteIndexCommand";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('Index commands test', () => {
  let requestsExecutor: RequestsExecutor;
  let indexMap: string;

  beforeEach(function (): void {
    ({requestsExecutor, indexMap} = this.currentTest as IRavenObject);
  });

  describe('Index actions', () => {
    it('should put index with success', async () => {
      const index: IndexDefinition = new IndexDefinition('region', indexMap);

      return expect(requestsExecutor.execute(new PutIndexesCommand(index))).to.be.fulfilled;
    });

    it('should get index with success', async () => {
      const index: IndexDefinition = new IndexDefinition('get_index', indexMap);

      return expect(requestsExecutor.execute(new PutIndexesCommand(index)))
        .to.be.fulfilled.then(() => requestsExecutor
        .execute(new GetIndexCommand('get_index'))
        .then((result: IRavenResponse) => expect(result).not.to.be.null));
    });

    it('should get index with fail', async () => requestsExecutor
      .execute(new GetIndexCommand('non_existing_index'))
      .then((result: IRavenResponse) => expect(result).to.be.undefined)
    );

    it('should delete index with success', async () => {
      let index: IndexDefinition = new IndexDefinition('delete', indexMap);

      return requestsExecutor.execute(new PutIndexesCommand(index))
        .then(() => requestsExecutor.execute(new DeleteIndexCommand('delete')))
        .then((result) => expect(result).to.be.undefined);
    });

    it('should delete index with fail', async () => expect(
        requestsExecutor.execute(new DeleteIndexCommand(null))
      ).to.be.rejected
    );
  });
});
