/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../src/Documents/DocumentStore';
import {IDocumentQuery} from '../src/Documents/Session/IDocumentQuery';
import * as Promise from 'bluebird'

describe('DocumentSession', () => {
  let query : IDocumentQuery;

  beforeEach(() => query = DocumentStore.create('localhost:8080', 'Northwind').openSession().query());

  describe('Count()', () => {
    it('should return promise', () => {
      const promise: Promise<number> = query.count();

      expect(promise).to.be.instanceof(Promise);
    });

    it('should return records count', (next) => {
      const promise: Promise<number> = query.count();

      promise.then(count => {
        expect(count).to.equals(1);
        next();
      })
    });

    it('should support also callbacks', (next) => {
      query.count((count?: number, error?: Error) => {
        expect(count).to.equals(1);
        next();
      })
    });
  });
});

