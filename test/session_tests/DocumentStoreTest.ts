/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {DocumentSession} from "../../src/Documents/Session/DocumentSession";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IHash} from "../../src/Utility/Hash";

describe('Document store test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IHash));
  });

  beforeEach(() => store = DocumentStore.create(defaultUrl, defaultDatabase));

  describe('Initialize()', () => {
    it('should initialize', () => {
      expect(store.initialize()).to.be.a.instanceof(DocumentStore);
    });

    it('should open session', () => {
      expect(store.initialize().openSession()).to.be.a.instanceof(DocumentSession);
    });
  });

  describe('Store', () => {
    it('should be without key', (done: MochaDone) => {
      session.store(session.create({name: 'test', key: 10}))
        .then(() => store.openSession().load("test" as string))
        .then((document: Object) => {
          expect(document.name).to.equals('test');
          done();
        });
    });

    it('should be with key', (done: MochaDone) => {
      session.store(session.create({name: 'test', key: 20}, 'testingStore/1'))
        .then(() => store.openSession().load("testingStore/1"))
        .then((document: Object) => {
          expect(document.key).to.equals(20);
          done();
        });
    });

    it('should be after delete fail', (done: MochaDone) => {
      session.store(session.create({name: 'test', key: 20}, 'testingStore'))
        .then(() => store.openSession().delete("testingStore"))
        .then((results) => {
          expect(results).should.be.rejected;
          done();
        });
    });
  });
});

