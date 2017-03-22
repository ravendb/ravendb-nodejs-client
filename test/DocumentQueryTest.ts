/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../src/Documents/DocumentStore';
import {IDocumentQuery} from '../src/Documents/Session/IDocumentQuery';
import * as Promise from 'bluebird'
import {IDocument} from "../src/Documents/IDocument";
import {Document} from "../src/Documents/Document";

describe('DocumentSession', () => {
  let query : IDocumentQuery;

  beforeEach(() => query = DocumentStore.create('localhost:8080', 'Northwind').initialize().openSession().query());

  describe('Get()', () => {
    it('should return promise', () => {
      const promise: Promise<IDocument[]> = query.get();

      expect(promise).to.be.instanceof(Promise);
    });

    it('should pass IDocument[] in .then()', (next) => {
      const promise: Promise<IDocument[]> = query.get();

      promise.then((documents: IDocument[]) => {
        expect(documents.length).to.equals(1);
        expect(documents[0]).to.be.instanceof(Document);
        next();
      })
    });

    it('should support also callbacks', (next) => {
      query.get((documents?: IDocument[], error?: Error) => {
        expect(documents.length).to.equals(1);
        expect(documents[0]).to.be.instanceof(Document);
        next();
      })
    });
  });
});

