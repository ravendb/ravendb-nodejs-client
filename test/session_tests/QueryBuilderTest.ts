/// <reference path='../../node_modules/@types/mocha/index.d.ts' />
/// <reference path='../../node_modules/@types/chai/index.d.ts' />
/// <reference path='../../node_modules/@types/chai-as-promised/index.d.ts' />

import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {Product} from "../TestClasses";
import {IDocumentQuery} from "../../src/Documents/Session/IDocumentQuery";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";

describe('Document query test', () => {
  let store: IDocumentStore;

  beforeEach(function (): void {
    ({store} = (this.currentTest as IRavenObject));
  });

  describe('Query Builder Test', () => {
    it('CanUnderstandEquality', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals<string>('Name', 'ayende', true);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE exact(Name = $p0)");
      expect(indexQuery.queryParameters['p0']).equals('ayende');
    });

    it('CanUnderstandEqualOnDate', async () => {
      const dateTime: Date = new Date(2010, 5, 15, 0, 0, 0, 0);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Birthday', dateTime);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Birthday = $p0");
      expect(indexQuery.queryParameters['p0']).equals('20100515T00:00:00.0000000');
    });

    it('CanUnderstandContains', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn<string>('Name', ['ryan', 'heath']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Name IN ($p0)");
      expect(indexQuery.queryParameters['p0']).equals(['ryan', 'heath']);
    });

    it('NoOpShouldProduceEmptyString', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'});

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName'");
    });

    it('CanUnderstandAnd', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Name', 'ayende')
        .andAlso()
        .whereEquals('Email', 'ayende@ayende.com');

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Name = $p0 AND Email = $p1");
      expect(indexQuery.queryParameters['p0']).equals('ayende');
      expect(indexQuery.queryParameters['p1']).equals('ayende@ayende.com');
    });

    it('CanUnderstandOr', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Name', 'ayende')
        .orElse()
        .whereEquals('Email', 'ayende@ayende.com');

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Name = $p0 OR Email = $p1");
      expect(indexQuery.queryParameters['p0']).equals('ayende');
      expect(indexQuery.queryParameters['p1']).equals('ayende@ayende.com');
    });

    it('CanUnderstandLessThan', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereLessThan('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age < $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandLessThanOrEqual', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereLessThanOrEqual('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age <= $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandGreaterThan', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThan('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age > $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandGreaterThanOrEqual', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age >= $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandProjectionOfSingleField', async () =>  {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual('Age', 16)
        .selectFields(['Name']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age >= $p0 SELECT Name");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandProjectionOfMultipleFields', async () =>  {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual('Age', 16)
        .selectFields(['Name', 'Age']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age >= $p0 SELECT Name, Age");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });    
  })
});
