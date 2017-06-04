/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import * as BluebirdPromise from 'bluebird';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {IDocumentQuery} from "../../src/Documents/Session/IDocumentQuery";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {IndexFieldOptions} from "../../src/Database/Indexes/IndexFieldOptions";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {LastFm, LastFmAnalyzed} from "../BaseTest";

describe('Document full text search', () => {
  let store: IDocumentStore;
  let requestExecutor: RequestsExecutor;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl, requestExecutor} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase);
    store.initialize();

    await (new LastFmAnalyzed(requestExecutor)).execute();
    await store.openSession(async(session:IDocumentSession) => {
      await session.store<LastFm>(session.create<LastFm>(new LastFm("LastFms/1", "Tania Maria", "TRALPJJ128F9311763", "Come With Me")));
      await session.store<LastFm>(session.create<LastFm>(new LastFm("LastFms/2", "Meghan Trainor", "TRBCNGI128F42597B4", "Me Too")));
      await session.store<LastFm>(session.create<LastFm>(new LastFm("LastFms/3", "Willie Bobo", "TRAACNS128F14A2DF5", "Spanish Grease")));
    });
  });

  describe('Text search', () => {
    it('should search by single keyword', async() => {
      const results: IRavenObject[] = await store.openSession()
        .query({
          documentTypeOrObjectType: LastFm, 
          indexName: LastFmAnalyzed.name,
          waitForNonStaleResults: true
        })
        .search('query', 'Me')
        .get();

      expect(results[0].title).to.have.string('Me');
      expect(results[1].title).to.have.string('Me');
    });

    it('should search by two keywords', async() => {
      const results: IRavenObject[] = await store.openSession()
        .query({
          documentTypeOrObjectType: LastFm, 
          indexName: LastFmAnalyzed.name,
          waitForNonStaleResults: true
        })
        .search('query', 'Me')
        .search('query', 'Bobo')
        .get();

      expect(results).to.be.lengthOf(3);
    });

    it('should search full text with boost', async () => {
      const results: IRavenObject[] = await store.openSession()
        .query({
          documentTypeOrObjectType: LastFm, 
          indexName: LastFmAnalyzed.name,
          waitForNonStaleResults: true
        })
        .search('query', 'Me', null, 10)
        .search('query', 'Bobo', null, 2)
        .get();

      expect(results[0].title).to.have.string('Me');
      expect(results[1].title).to.have.string('Me');
      expect(results[2].title).to.equals('Spanish Grease');
    });
  });
});