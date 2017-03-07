/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {Document} from '../src/Documents/Document';
import {DocumentStore} from '../src/Documents/DocumentStore';
import {DocumentSession} from '../src/Documents/Session/DocumentSession';
import {IDocumentSession} from '../src/Documents/Session/IDocumentSession';

describe('DocumentSession', () => {
  let subject : IDocumentSession;

  beforeEach(() => subject = DocumentStore.create('localhost:8080', 'Northwind').openSession());

  describe('Count()', () => {
    it('should return records count', () => {
      const query = subject.query<Document>();
      const count = query.count();

      expect(count).to.equals(1);
    });
  });
});

