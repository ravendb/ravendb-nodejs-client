/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../src/Documents/DocumentStore';
import {DocumentSession} from '../src/Documents/Session/DocumentSession';
import {IDocumentSession} from '../src/Documents/Session/IDocumentSession';
import {DocumentQuery} from '../src/Documents/Session/DocumentQuery';

describe('DocumentSession', () => {
  let subject : IDocumentSession;

  beforeEach(() => subject = DocumentStore.create('localhost:8080', 'Northwind').OpenSession());

  describe('Query()', () => {
    it('should return DocumentQuery instance', () => {
      const query = subject.Query<Object>();

      expect(query).to.be.an.instanceof(DocumentQuery);
    });
  });
});

