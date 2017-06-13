/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {DocumentSession} from "../../src/Documents/Session/DocumentSession";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Foo} from "../BaseTest";

describe('Document store test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IRavenObject));
  });

  beforeEach(() => store = DocumentStore.create(defaultUrl, defaultDatabase).initialize());

  describe('Store', () => {
    it('should store without key', async () => {
      let foo: Foo;
      session = store.openSession();

      foo = session.create<Foo>(new Foo(null, 'test', 10));
      await session.store<Foo>(foo);
      await session.saveChanges();

      foo = await store.openSession().load<Foo>(foo.id, Foo);
      expect(foo.name).to.equals('test');
    });

    it('should store with key', async () => {
      let foo: Foo;    
      const key: string = 'testingStore/1';
      session = store.openSession();

      foo = session.create<Foo>(new Foo(key, 'test', 20));
      await session.store<Foo>(foo);
      await session.saveChanges();

      foo = await store.openSession().load<Foo>(key, Foo);
      expect(foo.order).to.equals(20);      
    });

    it('should fail after delete', async () => {
      let foo: Foo;
      const key: string = 'testingStore';
      session = store.openSession();

      foo = session.create<Foo>(new Foo(key, 'test', 20));
      await session.store<Foo>(foo);
      await session.saveChanges();   
      
      await session.delete<Foo>(key);   
      await expect(session.store<Foo>(foo)).to.be.rejected;      
    });
  });
});

