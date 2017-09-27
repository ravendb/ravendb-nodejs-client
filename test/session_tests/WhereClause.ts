/// <reference path='../../node_modules/@types/mocha/index.d.ts' />
/// <reference path='../../node_modules/@types/chai/index.d.ts' />
/// <reference path='../../node_modules/@types/chai-as-promised/index.d.ts' />

import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {Product, Universal, UniversalsTestingSort} from "../TestClasses";
import {IDocumentQuery} from "../../src/Documents/Session/IDocumentQuery";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";

describe('Query builder test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;

  // beforeEach(function (): void {
  //   ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  // });
  //
  // beforeEach(async () => {
  //   const UniversalsTestingSorts: UniversalsTestingSort = new UniversalsTestingSort(store);
  //
  //   session = store.openSession();
  //
  //   await UniversalsTestingSorts.execute();
  //   await session.store<Universal>(new Universal('Universals_1', 'withNesting', 1, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_2', 'withNesting', 2, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_3', 'withNesting', 3, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_4', 'withNesting', 4, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_5', 'withNesting', 5, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_6', 'withNesting', 6, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_7', 'withNesting', 7, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_8', 'withNesting', 8, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_9', 'withNesting', 9, null, new Product(null, 'testing_order', 4)));
  //   await session.store<Universal>(new Universal('Universals_10', 'withNesting', 10, null, new Product(null, 'testing_order', 4)));
  //   await session.saveChanges();
  // });
  //
  // describe('Index checking', () => {

  it('WillRespectRenames', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'Renamed'
      })
      .whereEquals("Name", "red");

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM Renamed WHERE Name = $p0");
    expect(indexQuery.queryParameters["p0"]).equals("red");
  });

  it('HandlesNegative', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'Renamed'
      })
      .whereEquals("IsActive", false);

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM Renamed WHERE Name = $p0");
    expect(indexQuery.queryParameters["p0"]).equals(false);
  });

  //HandlesNegativeEquality ???

  it('HandleDoubleRangeSearch', async () => {
    //TODO add really min and max value
    const min = 1246.434565380224;
    const max = 1246.434565380226;

    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereBetween("Rate", min, max);

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Rate BETWEEN $p0 AND $p1");
    expect(indexQuery.queryParameters["p0"]).equals(min);
    expect(indexQuery.queryParameters["p1"]).equals(max);
  });

  it('CanHandleCasts', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereEquals("Animal.Color", 'black');

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Animal.Color = $p0");
    expect(indexQuery.queryParameters["p0"]).equals('black');
  });

  it('CanHandleCasts', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereEquals("Animal.Color", 'black');

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Animal.Color = $p0");
    expect(indexQuery.queryParameters["p0"]).equals('black');
  });

  it('StartsWith', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereStartsWith("Name", 'foo');

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE startsWith(Name, $p0)");
    expect(indexQuery.queryParameters["p0"]).equals('foo');
  });

  //StartsWithEqTrue
  //StartsWithEqFalse

  it('StartsWithNegated', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .openSubclause()
      .whereTrue()
      .andAlso()
      .not
      .whereStartsWith('Name', 'foo')
      .closeSubclause();

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE (true AND NOT startsWith(Name, $p0))");
    expect(indexQuery.queryParameters["p0"]).equals('foo');
  });

  it('IsNullOrEmpty', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .openSubclause()
      .whereEquals('Name', null)
      .orElse()
      .not
      .whereEquals('Name', '')
      .closeSubclause();

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE (Name = $p0 OR Name = $p1)");
    expect(indexQuery.queryParameters["p0"]).equals(null);
    expect(indexQuery.queryParameters["p1"]).equals('');
  });

  //IsNullOrEmptyEqTrue
  //IsNullOrEmptyEqFalse

  it('IsNullOrEmptyNegated', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .openSubclause()
      .whereTrue()
      .andAlso()
      .not
      .openSubclause()
      .whereEquals('Name', null)
      .orElse()
      .whereEquals('Name', '')
      .closeSubclause()
      .closeSubclause();

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE (true AND NOT (Name = $p0 OR Name = $p1))");
    expect(indexQuery.queryParameters["p0"]).equals(null);
    expect(indexQuery.queryParameters["p1"]).equals('');
  });

  //IsNullOrEmpty_Any
  //IsNullOrEmpty_Any_Negated_Not_Supported
  //IsNullOrEmpty_AnyEqTrue
  //IsNullOrEmpty_AnyEqFalse
  //IsNullOrEmpty_AnyNegated
  //AnyWithPredicateShouldBeNotSupported

  it('BracesOverrideOperatorPrecedence_second_method', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereEquals('Name', 'ayende')
      .andAlso()
      .openSubclause()
      .whereEquals('Name', 'rob')
      .orElse()
      .whereEquals('Name', 'dave')
      .closeSubclause();

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Name = $p0 AND (Name = $p1 OR Name = $p2)");
    expect(indexQuery.queryParameters["p0"]).equals('ayende');
    expect(indexQuery.queryParameters["p1"]).equals('rob');
    expect(indexQuery.queryParameters["p1"]).equals('dave');
  });

  it('BracesOverrideOperatorPrecedence_third_method', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .openSubclause()
      .whereEquals('Name', 'ayende')
      .closeSubclause()
      .andAlso()
      .openSubclause()
      .whereEquals('Name', 'rob')
      .orElse()
      .whereEquals('Name', 'dave')
      .closeSubclause();

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE (Name = $p0) AND (Name = $p1 OR Name = $p2)");
    expect(indexQuery.queryParameters["p0"]).equals('ayende');
    expect(indexQuery.queryParameters["p1"]).equals('rob');
    expect(indexQuery.queryParameters["p1"]).equals('dave');
  });

  //CanForceUsingIgnoreCase

  //TODO check <
  it('CanCompareValueThenPropertyGT', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereLessThan('Age', 15);

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Age < $p0");
    expect(indexQuery.queryParameters["p0"]).equals(15);
  });

  it('CanCompareValueThenPropertyGE', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereLessThanOrEqual('Age', 15);

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Age <= $p0");
    expect(indexQuery.queryParameters["p0"]).equals(15);
  });

  it('CanCompareValueThenPropertyLT', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereGreaterThan('Age', 15);

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Age > $p0");
    expect(indexQuery.queryParameters["p0"]).equals(15);
  });

  it('CanCompareValueThenPropertyLE', async () => {
    const query: IDocumentQuery = store
      .openSession()
      .query({
        documentType: 'IndexedUsers'
      })
      .whereGreaterThan('Age', 15);

    const indexQuery = query.getIndexQuery();
    expect(indexQuery.query).equals("FROM IndexedUsers WHERE Age >= $p0");
    expect(indexQuery.queryParameters["p0"]).equals(15);
  });

});
