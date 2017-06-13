/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {DocumentSession} from "../../src/Documents/Session/DocumentSession";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {DocumentConstructor} from "../../src/Documents/Conventions/DocumentConventions";
import {Foo, TestConversion} from "../TestClasses";

describe('Document conversion test', () => {
  const now: Date = new Date();
  let store: IDocumentStore;
  let session: IDocumentSession;
  let defaultDatabase: string, defaultUrl: string;

  const nestedObjectTypes: IRavenObject<DocumentConstructor> = {
    foo: Foo,
    foos: Foo,
    date: Date
  };

  const makeDocument = (id: string = null, date: Date = now): TestConversion => new TestConversion(
    id, date,
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
    session = store.openSession();

    await session.store<TestConversion>(session.create<TestConversion>(makeDocument('TestConversion/1'))); 
    await session.store<TestConversion>(session.create<TestConversion>(makeDocument('TestConversion/2', new Date(now.getTime() + 1000 * 60 * 60 * 24)))); 
    await session.saveChanges();   
  });

  describe('Conversion', () => {
    it('should convert on load', async () => {
      let doc: TestConversion;

      session = store.openSession();
      doc = await session.load<TestConversion>('TestConversion/1', TestConversion, [], nestedObjectTypes);

      checkDoc(doc);
    });

    it('should convert on store then on re-load', async () => {
      let doc: TestConversion;
      const key: string = 'TestingConversion/New';

      session = store.openSession();

      await session.store<TestConversion>(session.create<TestConversion>(makeDocument(key)));  
      await session.saveChanges();

      session = store.openSession();
      doc = await session.load<TestConversion>(key, TestConversion, [], nestedObjectTypes);

      checkDoc(doc);
    });

    it('should convert on query', async () => {
      let doc: TestConversion;
      let docs: TestConversion[];
      session = store.openSession();

      docs = await session.query<TestConversion>({
        documentTypeOrObjectType: TestConversion,
        nestedObjectTypes: nestedObjectTypes
      })
      .whereGreaterThan<Date>('date', now)
      .get();
      
      expect(docs).to.have.lengthOf(1);
      
      [doc] = docs;      
      expect(doc).to.have.property('id', 'TestConversion/2');
      checkDoc(doc);      
    });
  });
});

