/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {DocumentSession} from "../../src/Documents/Session/DocumentSession";
import {StringUtil} from "../../src/Utility/StringUtil";
import {ravenServer} from "./config/raven.server";
import {DocumentKey, IDocument} from "../../src/Documents/IDocument";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";

describe('DocumentStore', () => {
  let subject : IDocumentStore;
  let session: IDocumentSession;

  beforeEach(() => subject = DocumentStore.create(StringUtil.format('{host}:{port}', ravenServer), ravenServer.dbName));

  describe('Initialize()', () => {
    it('should initialize', () => {
      expect(subject.initialize()).to.be.a.instanceof(DocumentStore);
    });

    it('should open session', () => {
      expect(subject.initialize().openSession()).to.be.a.instanceof(DocumentSession);
    });
  });

  describe('Store', () => {

    it('should be without key', (done: MochaDone) => {
      session.store(session.create({name: 'test', key: 10})).then(() => {
        session = subject.openSession();
        (session.load("test" as DocumentKey) as Promise<IDocument>)
            .then((document: IDocument) => {
              expect(document.name).to.equals('test');
              done();
            });
      });

    });

    it('should be with key', (done: MochaDone) => {
      session.store(session.create({name: 'test', key: 20}, 'testingStore/1')).then(() => {
        session = subject.openSession();
        (session.load("testingStore/1" as DocumentKey) as Promise<IDocument>)
            .then((document: IDocument) => {
              expect(document.key).to.equals(20);
              done();
            });
      });
    });


    it('should be after delete fail', (done: MochaDone) => {
      session.store(session.create({name: 'test', key: 20}, 'testingStore')).then(() => {
        session = subject.openSession();
        (session.delete("testingStore" as DocumentKey) as Promise<IDocument>)
            .then((results) => {
              expect(results).should.be.rejected;
              done();
            });
      });
    });

  })
});

