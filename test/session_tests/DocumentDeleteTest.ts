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

  beforeEach((): Promise<any> => {
    store = DocumentStore.create(defaultUrl, defaultDatabase);
    store.initialize();
    const session: IDocumentSession = store.openSession();

    return Promise.all([
      session.store(session.create({_id: 'products/101', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/10', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/106', name: 'test'}, 'product')),
      session.store(session.create({_id: 'products/107', name: 'test'}, 'product'))
    ]);
  });

  describe('Document delete', () => {
    it('should delete with key and save session', (): Promise<any> => {
      const key: string = "products/101";

      return store.openSession().delete(key)
        .then((): Promise<IRavenObject> =>
          store.openSession().load(key)
        )
        .then((document: IRavenObject): void => {
            expect(document).not.to.exist;
        });
    });

    it('should delete after change', (): Promise<any> => {
      const key: string = "products/106";

      return store.openSession().load(key)
        .then((document: IRavenObject): Promise<IRavenObject> => {
          document.name = 'testing';

          return store.openSession().delete(key);
        })
        .then((document: IRavenObject): Promise<IRavenObject> =>
          store.openSession().load(key)
        )
        .then((document: IRavenObject) => {
          expect(document).not.to.exist;
        });
    });
  })
});