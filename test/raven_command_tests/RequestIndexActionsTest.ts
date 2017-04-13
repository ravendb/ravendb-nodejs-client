/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {StringUtil} from "../../src/Utility/StringUtil";
import * as Promise from 'bluebird';
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {GetIndexCommand} from "../../src/Database/Commands/GetIndexCommand";
import {DeleteIndexCommand} from "../../src/Database/Commands/DeleteIndexCommand";

describe('DocumentSession', () => {
    let store: IDocumentStore;
    let executor: RequestsExecutor;


    beforeEach((done: MochaDone) => {
        done()
    });


    describe('Batch request',()=> {

        it('should put index with success', (done: MochaDone) => {
            let index: IndexDefinition = new IndexDefinition('region', 'indexmap'/*????*/);
            executor.execute(new PutIndexesCommand(index)).then(() => {
                done();
            })
        });

        it('should get index with success', (done: MochaDone) => {
            let index: IndexDefinition = new IndexDefinition('get_index', 'indexmap'/*????*/);
            executor.execute(new PutIndexesCommand(index)).then(() => {
                executor.execute(new GetIndexCommand('get_index', false)).then((result) =>{
                    expect(result).not.to.be.null;
                    done();
                });
            })
        });
        it('should get index with fail', (done: MochaDone) => {
            executor.execute(new GetIndexCommand('reg', false)).then((result) =>{
                expect(result).to.be.null;
                done();
            });
        });

        it('should delete index with success', (done: MochaDone) => {
            let index: IndexDefinition = new IndexDefinition('delete', 'indexmap'/*????*/);
            executor.execute(new PutIndexesCommand(index)).then(() => {
                executor.execute(new DeleteIndexCommand('delete')).then((result) =>{
                    expect(result).to.be.null;
                    done();
                });
            })
        });

        it('should delete index with fail', (done: MochaDone) => {
            expect(executor.execute(new DeleteIndexCommand(null))).should.be.rejected.and.notify(done);
        });

    })

});

// import unittest
//     from pyravendb.data.indexes import IndexDefinition
//     from pyravendb.custom_exceptions import exceptions
//     from pyravendb.d_commands.raven_commands import PutIndexesCommand, GetIndexCommand, DeleteIndexCommand
// from pyravendb.tests.test_base import TestBase
//
//
// class TestIndexActions(TestBase):
// @classmethod
// def setUpClass(cls):
// super(TestIndexActions, cls).setUpClass()
//
// def test_put_index_success(self):
// index = IndexDefinition(name="region", index_map=self.index_map)
// assert self.requests_executor.execute(PutIndexesCommand(index))
//
// def test_get_index_success(self):
// index = IndexDefinition(name="get_index", index_map=self.index_map)
// assert self.requests_executor.execute(PutIndexesCommand(index))
// self.assertIsNotNone(self.requests_executor.execute(GetIndexCommand("get_index")))
//
// def test_get_index_fail(self):
// self.assertIsNone(self.requests_executor.execute(GetIndexCommand("reg")))
//
// def test_delete_index_success(self):
// index = IndexDefinition(name="delete", index_map=self.index_map)
// assert self.requests_executor.execute(PutIndexesCommand(index))
// self.assertIsNone(self.requests_executor.execute(DeleteIndexCommand("delete")))
//
// def test_delete_index_fail(self):
// with self.assertRaises(ValueError):
// self.requests_executor.execute(DeleteIndexCommand(None))
//
//
// if __name__ == "__main__":
// unittest.main()

