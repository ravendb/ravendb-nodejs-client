/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import * as BluebirdPromise from 'bluebird';
import {IRavenObject} from "../../src/Database/IRavenObject";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";

describe('Document delete test', () => {
  let store: IDocumentStore;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IRavenObject));
  });

  beforeEach((done: MochaDone) => {
    store = DocumentStore.create(defaultUrl, defaultDatabase);
    store.initialize();
    const session: IDocumentSession = store.openSession();

    BluebirdPromise.all([
      session.store(session.create({_id: 'products/101', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/10', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/106', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/107', name: 'test'}, 'product'))
    ])
    .then((): void => done());
  });

  describe('Document delete', () => {
    it('should delete with key and save session', (done: MochaDone) => {
      const string: string = "products/101";

      store.openSession().delete(string)
        .then((): BluebirdPromise.Thenable<IRavenObject> =>
          store.openSession().load(string)
        )
        .then((document: IRavenObject): void => {
            expect(document).not.to.exist;
            done();
        });
    });

    it('should delete after change', (done: MochaDone) => {
      const key: string = "products/106";

      store.openSession().load(key)
        .then((document: IRavenObject): Promise<IRavenObject> => {
          document.name = 'testing';

          return store.openSession().delete<IRavenObject>(key);
        })
        .then((document: IRavenObject): Promise<IRavenObject> =>
          store.openSession().load(key)
        )
        .then((document: IRavenObject) => {
          expect(document).not.to.exist;
          done();
        });
    });
  })
});