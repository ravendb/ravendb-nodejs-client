/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {PutIndexesOperation} from "../../src/Database/Operations/PutIndexesOperation";
import {GetIndexOperation} from "../../src/Database/Operations/GetIndexOperation";
import {DeleteIndexOperation} from "../../src/Database/Operations/DeleteIndexOperation";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";

describe('Index commands test', () => {
  let indexMap: string;
  let store: IDocumentStore;

  beforeEach(function (): void {
    ({indexMap, store} = this.currentTest as IRavenObject);
  });

  describe('Index actions', () => {
    it('should put index with success', async () => {
      const index: IndexDefinition = new IndexDefinition('region', indexMap);

      return expect(store.operations.send(new PutIndexesOperation(index))).to.be.fulfilled;
    });

    it('should get index with success', async () => {
      const index: IndexDefinition = new IndexDefinition('get_index', indexMap);

      return store.operations.send(new PutIndexesOperation(index))
        .then(() => store.operations
        .send(new GetIndexOperation('get_index'))
        .then((result: IRavenResponse) => expect(result).not.to.be.null));
    });

    it('should get index with fail', async () => expect(
      store.operations
        .send(new GetIndexOperation('non_existing_index'))
      ).to.be.rejected
    );

    it('should delete index with success', async () => {
      let index: IndexDefinition = new IndexDefinition('delete', indexMap);

      return store.operations.send(new PutIndexesOperation(index))
        .then(() => store.operations.send(new DeleteIndexOperation('delete')))
        .then((result) => expect(result).to.be.undefined);
    });

    it('should delete index with fail', async () => expect(
        store.operations.send(new DeleteIndexOperation(null))
      ).to.be.rejected
    );
  });
});
