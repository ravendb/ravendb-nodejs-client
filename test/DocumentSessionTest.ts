/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {Document} from '../src/Documents/Document';
import {DocumentStore} from '../src/Documents/DocumentStore';
import {DocumentSession} from '../src/Documents/Session/DocumentSession';
import {IDocumentSession} from '../src/Documents/Session/IDocumentSession';
import {DocumentQuery} from '../src/Documents/Session/DocumentQuery';

describe('DocumentSession', () => {
  let subject : IDocumentSession;

  beforeEach(() => subject = DocumentStore.create('localhost:8080', 'Northwind').openSession());

  describe('Query()', () => {
    it('should return DocumentQuery instance', () => {
      const query = subject.query<Document>();

      expect(query).to.be.an.instanceof(DocumentQuery);
    });
  });
});

