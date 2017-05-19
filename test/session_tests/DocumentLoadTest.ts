/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../../src/Documents/DocumentStore';
import * as BluebirdPromise from 'bluebird';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";

describe('Document load test', () => {
  let store: IDocumentStore;
  let document: IRavenObject;
  let documents: IRavenObject[];
  let session: IDocumentSession;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase);
    store.initialize();

    session = store.openSession();

    await Promise.all([
      session.store(session.create({_id: 'products/101', name: 'test'}, 'product')),
      session.store(session.create({_id: 'orders/10', name: 'test'}, 'order')),
      session.store(session.create({
        _id: 'orders/105',
        name: 'testing_order',
        key: 92,
        product_id: 'products/101'
      }, 'order')),
      session.store(session.create({_id: 'company/1', name: 'test', product: {name: 'testing_nested'}}, 'company'))
    ]);
  });

  describe('Document Load', () => {
    it('should load existing document', async () => {
      session = store.openSession();
      document = await session.load("products/101");

      expect(document['@metadata']['@object_type']).to.equals('product');
      expect(document.name).to.equals('test');
    });

    it('should not load missing document', async () => {
      session = store.openSession();
      document = await session.load("products/0");

      expect(document.name).to.equals(null);      
    });

    it('should load few documents', async () => {
      session = store.openSession();
      documents = await session.load(["products/101", "products/10"]);
      
      expect(documents).to.have.lengthOf(2);
    });

    it('should load few documents with duplicate id', async () => {
      session = store.openSession();
      documents = await session.load(["products/101", "products/101", "products/101"]);

      expect(documents).to.have.lengthOf(3);
      for (let document of documents) {
        expect(document.name).not.to.equals(null);
      }
    });

    it('should load track entity', async () => {
      session = store.openSession();
      document = await session.load("products/101");

      expect(document).to.be.an('object');
    });

    it('should key of document be an object', async () => {
      session = store.openSession();
      document = await session.load("company/1");

      expect(document.product).to.be.an('object');
      expect(document['@metadata']['@object_type']).to.equals('company');
    })
  });
});