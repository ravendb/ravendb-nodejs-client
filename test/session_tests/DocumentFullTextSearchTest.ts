/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {LastFm, LastFmAnalyzed} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('Document full text search', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    session = store.openSession();

    const lastFmAnalyzed: LastFmAnalyzed = new LastFmAnalyzed(store);
        
    await lastFmAnalyzed.execute();    
    await session.store<LastFm>(new LastFm("LastFms/1", "Tania Maria", "TRALPJJ128F9311763", "Come With Me"));
    await session.store<LastFm>(new LastFm("LastFms/2", "Meghan Trainor", "TRBCNGI128F42597B4", "Me Too"));
    await session.store<LastFm>(new LastFm("LastFms/3", "Willie Bobo", "TRAACNS128F14A2DF5", "Spanish Grease"));
    await session.saveChanges();
  });

  describe('Text search', () => {
    it('should search by single keyword', async() => {
      const results: LastFm[] = await store.openSession()
        .query<LastFm>({
          documentType: LastFm, 
          indexName: LastFmAnalyzed.name
        })
        .waitForNonStaleResults()
        .search('query', 'Me')
        .all();

      expect(results[0].title).to.have.string('Me');
      expect(results[1].title).to.have.string('Me');
    });

    it('should search by two keywords', async() => {
      const results: LastFm[] = await store.openSession()
        .query<LastFm>({
          documentType: LastFm, 
          indexName: LastFmAnalyzed.name
        })
        .waitForNonStaleResults()
        .search('query', 'Me Bobo')
        .all();

      expect(results).to.be.lengthOf(3);
    });

    it('should search full text with boost', async () => {
      const results: LastFm[] = await store.openSession()
        .query<LastFm>({
          documentType: LastFm, 
          indexName: LastFmAnalyzed.name
        })
        .waitForNonStaleResults()
        .search('query', 'Me')
        .boost(10)
        .search('query', 'Bobo')
        .boost(2)
        .all();

      expect(results[0].title).to.have.string('Me');
      expect(results[1].title).to.have.string('Me');
      expect(results[2].title).to.equals('Spanish Grease');
    });
  });
});