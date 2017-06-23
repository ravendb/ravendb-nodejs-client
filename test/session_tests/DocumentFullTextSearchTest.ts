/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {LastFm, LastFmAnalyzed} from "../TestClasses";

describe('Document full text search', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase).initialize();
    session = store.openSession();

    const lastFmAnalyzed: LastFmAnalyzed = new LastFmAnalyzed(store.getRequestsExecutor(defaultDatabase));
        
    await lastFmAnalyzed.execute();    
    await session.store<LastFm>(session.create<LastFm>(new LastFm("LastFms/1", "Tania Maria", "TRALPJJ128F9311763", "Come With Me")));
    await session.store<LastFm>(session.create<LastFm>(new LastFm("LastFms/2", "Meghan Trainor", "TRBCNGI128F42597B4", "Me Too")));
    await session.store<LastFm>(session.create<LastFm>(new LastFm("LastFms/3", "Willie Bobo", "TRAACNS128F14A2DF5", "Spanish Grease")));
    await session.saveChanges();
  });

  describe('Text search', () => {
    it('should search by single keyword', async() => {
      const results: LastFm[] = await store.openSession()
        .query<LastFm>({
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
      const results: LastFm[] = await store.openSession()
        .query<LastFm>({
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
      const results: LastFm[] = await store.openSession()
        .query<LastFm>({
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