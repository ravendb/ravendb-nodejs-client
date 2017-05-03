/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {GetIndexCommand} from "../../src/Database/Commands/GetIndexCommand";
import {DeleteIndexCommand} from "../../src/Database/Commands/DeleteIndexCommand";
import {IHash} from "../../src/Utility/Hash";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('Index commands test', () => {
  let requestsExecutor: RequestsExecutor;
  let indexMap: string;

  beforeEach(function (): void {
    ({requestsExecutor, indexMap} = this.currentTest as IHash);
  });

  describe('Index actions', () => {
    it('should put index with success', (done: MochaDone) => {
      const index: IndexDefinition = new IndexDefinition('region', indexMap);

      expect(requestsExecutor.execute(new PutIndexesCommand(index))).to.be.fulfilled.and.notify(done);
    });

    it('should get index with success', (done: MochaDone) => {
      const index: IndexDefinition = new IndexDefinition('region', indexMap);

      expect(requestsExecutor.execute(new PutIndexesCommand(index)))
        .to.be.fulfilled.and.notify(() => requestsExecutor
        .execute(new GetIndexCommand('get_index'))
        .then((result: IRavenResponse) => {
          expect(result).not.to.be.null;
          done();
        }));
    });

    it('should get index with fail', (done: MochaDone) => {
      requestsExecutor
        .execute(new GetIndexCommand('reg', false))
        .then((result: IRavenResponse) => {
          expect(result).to.be.null;
          done();
      });
    });

    it('should delete index with success', (done: MochaDone) => {
      let index: IndexDefinition = new IndexDefinition('delete', indexMap);

      requestsExecutor.execute(new PutIndexesCommand(index))
        .then(() => requestsExecutor.execute(new DeleteIndexCommand('delete')))
        .then((result) => {
          expect(result).to.be.null;
          done();
        });
      })
    });

    it('should delete index with fail', (done: MochaDone) => {
      expect(requestsExecutor.execute(new DeleteIndexCommand(null))).should.be.rejected.and.notify(done);
    });
});
