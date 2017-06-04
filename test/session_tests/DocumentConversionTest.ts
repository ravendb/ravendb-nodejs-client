/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {DocumentSession} from "../../src/Documents/Session/DocumentSession";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {DocumentConstructor} from "../../src/Documents/Conventions/DocumentConventions";
import {Foo, TestConversion} from "../BaseTest";

describe('Document conversion test', () => {
  let store: IDocumentStore;
  let defaultDatabase: string, defaultUrl: string;

  const nestedObjectTypes: IRavenObject<DocumentConstructor> = {
    foo: Foo,
    foos: Foo,
    date: Date
  };

  const makeDocument = (id: string = null): TestConversion => new TestConversion(
    id, new Date(),
    new Foo('Foo/1', 'Foo #1', 1), [
      new Foo('Foo/2', 'Foo #2', 2),
      new Foo('Foo/3', 'Foo #3', 3)
    ]
  );

  const checkFoo = (foo: Foo, idOfFoo: number = 1): void => {
    expect(foo).to.be.a('object');
    expect(foo).to.be.a.instanceOf(Foo);
    expect(foo.id).to.equal(`Foo/${idOfFoo}`);
    expect(foo.name).to.equal(`Foo #${idOfFoo}`);
    expect(foo.order).to.equal(idOfFoo);
  };

  const checkDoc: (doc: TestConversion) => void = (doc: TestConversion) => {
    expect(doc).to.be.a('object');
    expect(doc).to.be.a.instanceOf(TestConversion);
    expect(doc.date).to.be.a('object');
    expect(doc.date).to.be.a.instanceOf(Date);
    checkFoo(doc.foo);

    expect(doc.foos).to.be.an('array');
    doc.foos.forEach((item: Foo, index: number) => checkFoo(item, index + 2));
  };

  beforeEach(function (): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase).initialize();

    await store.openSession(async (session: IDocumentSession) => {
      await session.store<TestConversion>(session.create<TestConversion>(makeDocument('TestConversion/1')));    
    });
  });

  describe('Conversion', () => {
    it('should convert on load', async () => {
      await store.openSession(async (session: IDocumentSession) => {
        const doc: TestConversion = await session.load<TestConversion>('TestConversion/1', TestConversion, [], nestedObjectTypes);

        checkDoc(doc);
      });
    });

    it('should convert on store then on re-load', async () => {
      const key: string = 'TestingConversion/New';

      await store.openSession(async (session: IDocumentSession) => {
        await session.store<TestConversion>(session.create<TestConversion>(makeDocument(key)));  
      });

      await store.openSession(async (session: IDocumentSession) => {
        const doc: TestConversion = await session.load<TestConversion>(key, TestConversion, [], nestedObjectTypes);

        checkDoc(doc);
      }); 
    });

    it('should convert on query', async () => {
      await store.openSession(async (session: IDocumentSession) => {
        const docs: TestConversion[] = await session.query<TestConversion>({
          documentTypeOrObjectType: TestConversion,
          nestedObjectTypes: nestedObjectTypes
        }).get();

        docs.forEach((doc: TestConversion) => checkDoc(doc));
      });
    });
  });
});

