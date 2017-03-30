/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../src/Documents/IDocumentStore";
import {DocumentStore} from '../src/Documents/DocumentStore';
import {DocumentSession} from "../src/Documents/Session/DocumentSession";
import {StringUtil} from "../src/Utility/StringUtil";
import {ravenServer} from "./config/raven.server";

describe('DocumentStore', () => {
  let subject : IDocumentStore;

  beforeEach(() => subject = DocumentStore.create(StringUtil.format('{host}:{port}', ravenServer), ravenServer.dbName));

  describe('Initialize()', () => {
    it('should initialize', () => {
      expect(subject.initialize()).to.be.a.instanceof(DocumentStore);
    });

    it('should open session', () => {
      expect(subject.initialize().openSession()).to.be.a.instanceof(DocumentSession);
    });
  });
});

