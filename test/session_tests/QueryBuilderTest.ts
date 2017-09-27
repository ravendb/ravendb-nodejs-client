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
    it('CanUnderstandEquality', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals<string>('Name', 'ayende', true);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE exact(Name = $p0)");
      expect(indexQuery.queryParameters['p0']).equals('ayende');
    });

    it('CanUnderstandEqualOnDate', () => {
      const dateTime: Date = new Date(2010, 5, 15, 0, 0, 0, 0);

      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals<Date>('Birthday', dateTime);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Birthday = $p0");
      expect(indexQuery.queryParameters['p0']).equals('20100515T00:00:00.0000000');
    });

    it('CanUnderstandContains', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereIn<string>('Name', ['ryan', 'heath']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Name IN ($p0)");
      expect(indexQuery.queryParameters['p0']).equals(['ryan', 'heath']);
    });

    it('NoOpShouldProduceEmptyString', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'});

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName'");
    });

    it('CanUnderstandAnd', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals<string>('Name', 'ayende')
        .andAlso()
        .whereEquals<string>('Email', 'ayende@ayende.com');

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Name = $p0 AND Email = $p1");
      expect(indexQuery.queryParameters['p0']).equals('ayende');
      expect(indexQuery.queryParameters['p1']).equals('ayende@ayende.com');
    });

    it('CanUnderstandOr', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereEquals<string>('Name', 'ayende')
        .orElse()
        .whereEquals<string>('Email', 'ayende@ayende.com');

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Name = $p0 OR Email = $p1");
      expect(indexQuery.queryParameters['p0']).equals('ayende');
      expect(indexQuery.queryParameters['p1']).equals('ayende@ayende.com');
    });

    it('CanUnderstandLessThan', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereLessThan<number>('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age < $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandLessThanOrEqual', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereLessThanOrEqual<number>('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age <= $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandGreaterThan', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThan<number>('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age > $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandGreaterThanOrEqual', () => {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual<number>('Age', 16);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age >= $p0");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandProjectionOfSingleField', () =>  {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual<number>('Age', 16)
        .selectFields(['Name']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age >= $p0 SELECT Name");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });

    it('CanUnderstandProjectionOfMultipleFields', () =>  {
      const query: IDocumentQuery = store
        .openSession()
        .query({indexName: 'IndexName'})
        .whereGreaterThanOrEqual<number>('Age', 16)
        .selectFields(['Name', 'Age']);

      const indexQuery: IndexQuery = query.getIndexQuery();

      expect(indexQuery.query).equals("FROM INDEX 'IndexName' WHERE Age >= $p0 SELECT Name, Age");
      expect(indexQuery.queryParameters['p0']).equals(16);
    });
  })
});
