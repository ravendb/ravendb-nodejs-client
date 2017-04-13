/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import * as Promise from 'bluebird';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {IDocumentQuery} from "../../src/Documents/Session/IDocumentQuery";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {ravenServer} from "./config/raven.server";
import {StringUtil} from "../../src/Utility/StringUtil";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {IndexFieldOptions} from "../../src/Database/Indexes/IndexFieldOptions";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";

describe('Document Session', () => {
  let store: IDocumentStore;
  let executor: RequestsExecutor;
  let query: IDocumentQuery;
  let session: IDocumentSession;

  beforeEach((done: MochaDone) => {
    store = DocumentStore.create(StringUtil.format('{host}:{port}', ravenServer), ravenServer.dbName);
    store.initialize().openSession();


    const indexMap: string = "from song in docs.LastFms select new {query = new object[] {song.artist, ((object)song.datetime_time), song.tags, song.title, song.track_id}}";
    const indexDefinition: IndexDefinition = new IndexDefinition('LastFmAnalyzed', indexMap, null, {
      fields: {
        "query": new IndexFieldOptions(null,'Analyzed')
      }
    });

      executor.execute(new PutIndexesCommand(indexDefinition))
          .then(() => {
              session = store.openSession();
              return Promise.all([
                  session.store(session.create({artist: 'Tania Maria', track_id: 'TRALPJJ128F9311763', title: 'Come With Me', datetime_time: Date.now()}, 'LastFms/1')),
                  session.store(session.create({artist: 'Meghan Trainor', track_id: 'TRBCNGI128F42597B4', title: 'Me Too', datetime_time: Date.now()}, 'LastFms/2')),
                  session.store(session.create({artist: 'Willie Bobo', track_id: 'TRAACNS128F14A2DF5', title: 'Spanish Grease', datetime_time: Date.now()}, 'LastFms/3')),

              ])
                  .then(() => done());
          });
  });

  describe('Text search',() => {

      it('should search one result', (done: MochaDone) => {
          session = store.openSession();
          session.query('LastFm', 'LastFmAnalyzed', null, true).search('query', 'Me').get().then((results) => {
              expect(results[0].title).to.equals('Me');
              expect(results[1].title).to.equals('Me');
              done();
          })
      });
      it('should search two results', (done: MochaDone) => {
          session = store.openSession();
          session.query('LastFm', 'LastFmAnalyzed', null, true).search('query', 'Me').search('query', 'Bobo').get().then((results) => {
              expect(results).to.be.lengthOf(3);
              done();
          })
      });

      it('should search full text with boost', (done: MochaDone) => {
          session = store.openSession();
          session.query('LastFm', 'LastFmAnalyzed', null, true).search('query', 'Me', null, 10).search('query', 'Bobo', null, 2).get().then((results) => {
              expect(results[0].title).to.equals('Me');
              expect(results[1].title).to.equals('Me');
              expect(results[2].title).to.equals('Spanish Grease');
              done();
          });
      })
  })
});