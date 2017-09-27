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
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  });

  describe('Query Builder Test', () => {
    it('CanUnderstandSimpleEquality', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Name', 'ayende', true);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE exact(Name = $p0)`);
      expect(indexQuery.queryParameters['p0']).equals('ayende');

    });

    it('CanUnderstandSimpleEqualityWithVariable', async () => {
      const ayende: string = 'ayende' + 1;

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Name', ayende, true);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE exact(Name = $p0)`);
      expect(indexQuery.queryParameters['p0']).equals(ayende);

    });

    it('CanUnderstandSimpleContains', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', ['ayende']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals(['ayende']);

    });

    it('CanUnderstandParamArrayContains', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', ['ryan', 'heath']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals(['ryan', 'heath']);

    });

    it('CanUnderstandArrayContains', async () => {
      const array: string[] = ['ryan', 'heath'];

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', array);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals(['ryan', 'heath']);

    });

    it('CanUnderstandArrayContainsWithPhrase', async () => {
      const array: string[] = ['ryan', 'heath here'];

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', array);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals(['ryan', 'heath here']);

    });

    it('CanUnderstandArrayContainsWithOneElement', async () => {
      const array: string[] = ['ryan'];

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', array);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals(['ryan']);

    });

    it('CanUnderstandArrayContainsWithZeroElements', async () => {
      const array: string[] = [];

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', array);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals([]);

    });

    it('CanUnderstandEnumerableContains', async () => {
      const list: string[] = ['ryan', 'heath'];

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', list);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals({ryan: 'ryan', heath: 'heath'});

    });

    it('CanUnderstandSimpleContainsWithVariable', async () => {
      const ayende = ['ayende' + 1];

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn('Name', ayende);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name IN ($p0)`);
      expect(indexQuery.queryParameters['p0']).equals({ayende: 'ayende1'});
    });

    it('NoOpShouldProduceEmptyString', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'});

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName'`);

    });

    it('CanUnderstandAnd', async () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Name', 'ayende')
        .andAlso()
        .whereEquals('Email', 'ayende@ayende.com');

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name = $p0 AND Email = $p1`);
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

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Name = $p0 OR Email = $p1`);
      expect(indexQuery.queryParameters['p0']).equals('ayende');
      expect(indexQuery.queryParameters['p1']).equals('ayende@ayende.com');

    });

    it('CanUnderstandLessThan', async () => {
      const dateTime: Date = new Date(2010, 5, 15);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereLessThan('Birthday', dateTime);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday < $p0`);
      expect(indexQuery.queryParameters['p0']).equals(dateTime);

    });

    it('CanUnderstandEqualOnDate', async () => {
      const dateTime: Date = new Date(2010, 5, 15);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Birthday', dateTime);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday = $p0`);
      expect(indexQuery.queryParameters['p0']).equals(dateTime);

    });

    it('CanUnderstandLessThanOrEqual', async () => {
      const dateTime: Date = new Date(2010, 5, 15);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereLessThanOrEqual('Birthday', dateTime);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday <= $p0`);
      expect(indexQuery.queryParameters['p0']).equals(dateTime);

    });

    it('CanUnderstandGreaterThan', async () => {
      const dateTime: Date = new Date(2010, 5, 15);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThan('Birthday', dateTime);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday > $p0`);
      expect(indexQuery.queryParameters['p0']).equals(dateTime);

    });

    it('CanUnderstandGreaterThanOrEqual', async () => {
      const dateTime: Date = new Date(2010, 5, 15);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual('Birthday', dateTime);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday >= $p0`);
      expect(indexQuery.queryParameters['p0']).equals(dateTime);

    });

    it('CanUnderstandProjectionOfSingleField', async () =>  {
      const dateTime: Date = new Date(2010, 5, 15);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual('Birthday', dateTime)
        .selectFields(['Name']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday >= $p0 SELECT Name`);
      expect(indexQuery.queryParameters['p0']).equals(dateTime);

    });

    it('CanUnderstandProjectionOfMultipleFields', async () =>  {
      const dateTime: Date = new Date(2010, 5, 15);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual('Birthday', dateTime)
        .selectFields(['Name', 'Age']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday >= $p0 SELECT Name, Age`);
      expect(indexQuery.queryParameters['p0']).equals(dateTime);

    });

    it('CanUnderstandSimpleEqualityOnInt', async () =>  {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals('Age', 3);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Birthday >= $p0 SELECT Name, Age`);
      expect(indexQuery.queryParameters['p0']).equals(3);

    });

    it('CanUnderstandGreaterThanOnInt', async () =>  {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThan('Age', 3);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.toString()).equals(`FROM INDEX 'IndexName' WHERE Age > $p0`);
      expect(indexQuery.queryParameters['p0']).equals(3);

    });
  })
});
