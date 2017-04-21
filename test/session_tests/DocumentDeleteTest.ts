/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import * as Promise from 'bluebird';
import {IHash} from "../../src/Utility/Hash";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentKey, IDocument} from "../../src/Documents/IDocument";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";

describe('Document delete test', () => {
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
      session.store(session.create({_id: 'products/10', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/106', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/107', name: 'test'}, 'product'))
    ])
    .then((): void => done());
  });

  describe('Document delete', () => {
    it('should delete with key and save session', (done: MochaDone) => {
      const documentKey: DocumentKey = "products/101";

      store.openSession().delete(documentKey)
        .then((): Promise.Thenable<IDocument> =>
          store.openSession().load(documentKey)
        )
        .then((document: IDocument): void => {
            expect(document).not.to.exist;
            done();
        });
    });

    it('should delete after change', (done: MochaDone) => {
      const documentKey: DocumentKey = "products/106";

      store.openSession().load(documentKey)
        .then((document: IDocument): Promise.Thenable<IDocument> => {
          document.name = 'testing';

          return store.openSession().delete(documentKey);
        })
        .then((document: IDocument): Promise.Thenable<IDocument> =>
          store.openSession().load(documentKey)
        )
        .then((document: IDocument) => {
          expect(document).not.to.exist;
          done();
        });
    });
  })
});