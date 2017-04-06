/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../src/Documents/DocumentStore';
import {IDocumentQuery} from '../src/Documents/Session/IDocumentQuery';
import * as Promise from 'bluebird'
import {IDocument} from "../src/Documents/IDocument";
import {Document} from "../src/Documents/Document";
import {StringUtil} from "../src/Utility/StringUtil";
import {ravenServer} from "./config/raven.server";
import {IDocumentStore} from "../src/Documents/IDocumentStore";
import {IDocumentSession} from "../src/Documents/Session/IDocumentSession";
import {PutIndexesCommand} from "../src/Database/Commands/PutIndexesCommand"
import {RequestsExecutor} from "../src/Http/Request/RequestsExecutor";

describe('DocumentSession', () => {
  let query : IDocumentQuery;
  let store: IDocumentStore;
  const executor: RequestsExecutor;

  beforeEach((done: MochaDone) => {
    query = DocumentStore.create(StringUtil.format('{host}:{port}', ravenServer), ravenServer.dbName).initialize().openSession().query();

  //   executor.execute()
  //    .then(() => {
  //       const session: IDocumentSession = store.openSession();
  //         return Promise.all([
  //           session.store(new Document({name: 'test101', key: 2, order: 'a'}), 'products/101'),
  //           session.store(new Document({name: 'test10',key: 3, order: 'test'}), 'products/10'),
  //           session.store(new Document({name: 'test106',key: 4,  order: 'c'}), 'products/106'),
  //           session.store(new Document({name: 'test107',key: 5,  order: null}), 'products/107'),
  //           session.store(new Document({name: 'test107',key: 6,  order: null}), 'products/103'),
  //           session.store(new Document({name: 'new_testing',key: 90,  order: 'd'}), 'products/108'),
  //           session.store(new Document({name: 'testing_order',key: 92,  order: 'products/108'}), 'orders/105'),
  //           session.store(new Document({name: 'withNesting', product: {name: 'testing_order',key: 4, order: null}}), 'company/1')
  //     ])
  //     .then(() => done())
  // });

  describe('Get()', () => {
    it('should return promise', () => {
      const promise: Promise<IDocument[]> = query.get();

      expect(promise).to.be.instanceof(Promise);
    });

    it('should pass IDocument[] in .then()', (next) => {
      const promise: Promise<IDocument[]> = query.get();

      promise.then((documents: IDocument[]) => {
        expect(documents.length).to.equals(1);
        expect(documents[0]).to.be.instanceof(Document);
        next();
      })
    });

    it('should support also callbacks', (next) => {
      query.get((documents?: IDocument[], error?: Error) => {
        expect(documents.length).to.equals(1);
        expect(documents[0]).to.be.instanceof(Document);
        next();
      })
    });
  });
});

