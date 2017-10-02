/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {DocumentConstructor} from "../../src/Documents/Conventions/DocumentConventions";
import {Foo, TestConversion, TestCustomIdProperty} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('Document conversion test', () => {
  const now: Date = new Date();
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let defaultDatabase: string, defaultUrl: string;

  const nestedObjectTypes: IRavenObject<DocumentConstructor> = {
    foo: Foo,
    foos: Foo,
    date: Date
  };

  const resolveIdProperty = (typeName: string): string => {
    if (TestCustomIdProperty.name === typeName) {
      return 'Id';
    }
  };

  const resolveConstructor = (typeName: string): DocumentConstructor => {
    const classesMap: IRavenObject<DocumentConstructor> =
      <IRavenObject<DocumentConstructor>>require('../TestClasses');

    let foundCtor: DocumentConstructor;  

    if (Date.name === typeName) {
      return Date;
    } else if ((typeName in classesMap) && ('function' === 
      (typeof (foundCtor = classesMap[typeName])))
    ) {
      return foundCtor;
    } 
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

  const checkDoc = (id: string, doc: TestConversion): void => {
    expect(doc).to.be.a('object');
    expect(doc).to.be.a.instanceOf(TestConversion);
    expect(doc).to.have.property('id', id);
    expect(typeof doc.date).to.equal('object');
    expect(doc.date).to.be.a.instanceOf(Date);
    checkFoo(doc.foo);

    expect(doc.foos).to.be.an('array');
    doc.foos.forEach((item: Foo, index: number) => checkFoo(item, index + 2));
  };

  beforeEach(function (): void {
    ({defaultDatabase, defaultUrl, store} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    session = store.openSession();

    await session.store<TestConversion>(makeDocument('TestConversion/1')); 
    await session.store<TestConversion>(makeDocument('TestConversion/2', new Date(now.getTime() + 1000 * 60 * 60 * 24))); 
    await session.saveChanges();   
  });

  describe('Conversion', () => {
    it('should convert on load', async () => {
      let doc: TestConversion;
      const key: string = 'TestConversion/1';

      session = store.openSession();
      doc = await session.load<TestConversion>(key, TestConversion, [], nestedObjectTypes);
      
      checkDoc(key, doc);
    });

    it('should resolve document constructors', async () => {
      let docs: TestConversion[] = [];
      
      session = store.openSession();
      store.conventions.addDocumentInfoResolver({ resolveConstructor });

      await session.load<TestConversion>('TestConversion/1')
        .then((result: TestConversion) => docs.push(result));

      await session.query<TestConversion>({
        documentType: TestConversion.name
      })
      .waitForNonStaleResults()
      .all()
      .then((result: TestConversion[]) => 
        docs = docs.concat(result)
      );

      expect(docs).to.have.lengthOf(3);
      
      [1, 1, 2].forEach((id: number, index: number) =>
        checkDoc(`TestConversion/${id}`, docs[index])
      );
    });

    it('should convert on store then on re-load', async () => {
      let doc: TestConversion;
      const key: string = 'TestingConversion/New';

      session = store.openSession();

      await session.store<TestConversion>(makeDocument(key));  
      await session.saveChanges();

      session = store.openSession();
      doc = await session.load<TestConversion>(key, TestConversion, [], nestedObjectTypes);

      checkDoc(key, doc);
    });

    it('should convert on query', async () => {
      let doc: TestConversion;
      let docs: TestConversion[];
      session = store.openSession();

      docs = await session.query<TestConversion>({
        documentType: TestConversion,
        nestedObjectTypes: nestedObjectTypes
      })
      .waitForNonStaleResults()
      .whereGreaterThan<Date>('date', now)
      .all();
      
      expect(docs).to.have.lengthOf(1);
      
      [doc] = docs;            
      checkDoc('TestConversion/2', doc);      
    });

    it('should resolve custom id property name', async () => {
      const key: string = 'TestingCustomIdProperty/New';
      const title: string = 'Testing custom id property';
      let doc: TestCustomIdProperty = new TestCustomIdProperty(key, title);

      session = store.openSession();
      store.conventions.addDocumentInfoResolver({ resolveIdProperty, resolveConstructor });

      await session.store<TestCustomIdProperty>(doc);  
      await session.saveChanges();

      session = store.openSession();
      doc = await session.load<TestCustomIdProperty>(key);

      expect(doc).to.be.an('object');
      expect(doc).to.be.a.instanceOf(TestCustomIdProperty);
      expect(doc).to.have.property('Id', key);
      expect(doc).to.have.property('Title', title);
    });
  });
});

