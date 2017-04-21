/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../../src/Documents/DocumentStore';
import * as Promise from 'bluebird';
import {DocumentKey, IDocument} from "../../src/Documents/IDocument";
import {Document} from "../../src/Documents/Document";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IHash} from "../../src/Utility/Hash";

describe('DocumentSession', () => {
  let store: IDocumentStore;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IHash));
  });

  beforeEach((done: MochaDone) => {
    store = DocumentStore.create(defaultUrl, defaultDatabase);
    store.initialize();

    const session: IDocumentSession = store.openSession();

    Promise.all([
      session.store(session.create({_id: 'products/101', name: 'test'}, 'product')),
      session.store(session.create({_id: 'orders/10', name: 'test'}, 'order')),
      session.store(session.create({
        _id: 'orders/105',
        name: 'testing_order',
        key: 92,
        product_id: 'products/101'
      }, 'order')),
      session.store(session.create({_id: 'company/1', name: 'test', product: {name: 'testing_nested'}}, 'company'))
    ]).then(() => done());
  });

  describe('Document Load', () => {
    it('should load existing document', (done: MochaDone) => {
      const session: IDocumentSession = store.openSession();

      session.load("products/101")
        .then((document: IDocument) => {
          expect(document['@metadata']['@object_type']).to.equals('product');
          expect(document.name).to.equals('test');
          done();
        });
    });

    it('should not load missing document', (done: MochaDone) => {
      const session: IDocumentSession = store.openSession();

      session.load("products/0" as DocumentKey)
        .then((document: IDocument) => {
          expect(document.name).to.equals(null);
          done();
        });
    });

    it('should load few documents', (done: MochaDone) => {
      const session: IDocumentSession = store.openSession();

      session.load(["products/101", "products/10"])
        .then((document: IDocument[]) => {
          expect(document).to.have.lengthOf(2);
          done();
        });
    });

    it('should load few documents with duplicate id', (done: MochaDone) => {
      const session: IDocumentSession = store.openSession();

      session.load(["products/101", "products/101", "products/101"])
        .then((document: IDocument[]) => {
          expect(document).to.have.lengthOf(3);

          for (let key of document) {
            expect(key.name).not.to.equals(null);
          }

          done();
        });
    });

    it('should load track entity', (done: MochaDone) => {
      const session: IDocumentSession = store.openSession();

      session.load("products/101" as DocumentKey)
        .then((document: IDocument) => {
          expect(document).to.be.an.instanceOf(Document);
          done();
        });
    });

    it('should key of document be an object', (done: MochaDone) => {
      const session: IDocumentSession = store.openSession();

      session.load("company/1"  as DocumentKey)
        .then((document: IDocument) => {
          expect(document.product).to.be.an('object');
          expect(document.product).to.be.an.instanceOf(Document);
          expect(document['@metadata']['@object_type']).to.equals('company');
          done();
        });
    })
  });
});