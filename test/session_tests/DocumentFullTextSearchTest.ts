/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {LastFm, LastFmAnalyzed} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('Document full text search', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl, requestExecutor} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase).initialize();
    session = store.openSession({requestExecutor});

    const lastFmAnalyzed: LastFmAnalyzed = new LastFmAnalyzed(requestExecutor);
        
    await lastFmAnalyzed.execute();    
    await session.store<LastFm>(new LastFm("LastFm/1", "Tania Maria", "TRALPJJ128F9311763", "Come With Me"));
    await session.store<LastFm>(new LastFm("LastFm/2", "Meghan Trainor", "TRBCNGI128F42597B4", "Me Too"));
    await session.store<LastFm>(new LastFm("LastFm/3", "Willie Bobo", "TRAACNS128F14A2DF5", "Spanish Grease"));
    await session.saveChanges();
  });

  describe('Text search', () => {
    it('should search by single keyword', async() => {
      const results: LastFm[] = await store.openSession({requestExecutor})
        .query<LastFm>({
          documentType: LastFm, 
          indexName: LastFmAnalyzed.name,
          waitForNonStaleResults: true
        })
        .search('query', 'Me')
        .get();

      expect(results[0].title).to.have.string('Me');
      expect(results[1].title).to.have.string('Me');
    });

    it('should search by two keywords', async() => {
      const results: LastFm[] = await store.openSession({requestExecutor})
        .query<LastFm>({
          documentType: LastFm, 
          indexName: LastFmAnalyzed.name,
          waitForNonStaleResults: true
        })
        .search('query', 'Me')
        .search('query', 'Bobo')
        .get();

      expect(results).to.be.lengthOf(3);
    });

    it('should search full text with boost', async () => {
      const results: LastFm[] = await store.openSession({requestExecutor})
        .query<LastFm>({
          documentType: LastFm, 
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