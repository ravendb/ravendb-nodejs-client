/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../src/Documents/DocumentStore';
import {DocumentSession} from '../src/Documents/Session/DocumentSession';
import {IDocumentSession} from '../src/Documents/Session/IDocumentSession';

describe('DocumentSession', () => {
  let subject : IDocumentSession;

  beforeEach(() => subject = DocumentStore.Create('localhost:8080', 'Northwind').OpenSession());

  describe('Count()', () => {
    it('should return records count', () => {
      const query = subject.Query<Object>();
      const count = query.Count();

      expect(count).to.equals(1);
    });
  });
});

