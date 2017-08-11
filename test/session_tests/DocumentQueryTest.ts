/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as _ from 'lodash';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Product, ProductsTestingSort, Universal} from "../TestClasses";

describe('Document query test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    const productsTestingSort: ProductsTestingSort = new ProductsTestingSort(store);

    session = store.openSession();

    await productsTestingSort.execute();
    await session.store<Universal>(new Universal('Universals_1', 'withNesting', 1, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_2', 'withNesting', 2, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_3', 'withNesting', 3, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_4', 'withNesting', 4, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_5', 'withNesting', 5, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_6', 'withNesting', 6, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_7', 'withNesting', 7, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_8', 'withNesting', 8, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_9', 'withNesting', 9, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_10', 'withNesting', 10, null, new Product(null, 'testing_order', 4)));
    await session.saveChanges();
  });


  describe('Index checking', () => {

    it('should query with nested objects', async() => {
      const results: Universal[] = await store.openSession().query<Universal>({
        indexName: 'Universals',
        nestedObjectTypes: {product: Product}
      }).whereEquals<string>('name', 'withNesting').get();

      expect(results[0].product).to.be.instanceOf(Product);
    });

    it('should make query with fetch terms', async() => {
      const results: Universal[] = await store.openSession().query<Universal>({
        WaitForNonStaleResults: true,
        indexName: 'Universals'
      }).selectFields('id').get();

      expect(_.every(results, (result: Product) => result.hasOwnProperty('id'))).to.be.true;
    });

    it('should query with includes', async() => {
      session = store.openSession();

      await session.query<Universal>({
        indexName: 'Universals',
        includes: ['name']
      }).where({'name': 'withNesting'}).get();

      await session.load('Universals_1');
      expect(session.numberOfRequestsInSession).to.equals(1);
    });

    it('should query with whereArray', async() => expect(
      store.openSession().query<Universal>({
            indexName: 'Universals'
          }).where({
        name: [4, 6, 90]
      }).get()
      ).to.be.fulfilled
    );

    it('should query with where', async() => expect(
      store.openSession().query<Universal>({
        indexName: 'Universals'
      }).where({name: 4}).get()
      ).to.be.fulfilled
    );

    it('should fail query with non-existing index', async () => {
    const results = await store.openSession().query<Universal>({
      indexName: 's'
    }).whereIn('Tag', 'Products').get();

    expect(results).to.have.lengthOf(0);
  });

  it('should query by @all_docs index', async () => {
    const results: Universal[] = await store.openSession().query<Universal>({
      // documentType: Product //dynamic/Product
    }).whereIn('name', 'withNesting').get();

    expect(results[0]).to.be.a('object');
  });

  it('should paginate', async() => {
    const pageSize: number = 2;

    const totalCount: Universal[] = await store.openSession().query<Universal>({
      indexName: 'Universals',
      WaitForNonStaleResults: true
    }).whereIn('name', 'withNesting').get();

    const totalPages: number = Math.ceil(totalCount.length / pageSize);

    expect(totalPages).to.equals(5);
  });

  it('should query with whereEquals', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereEquals('name', 'withNesting').get();
    expect(results[0]).to.be.a('object');
  });
    it('should query with andAlso', async () => {
      const results = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .andAlso();
      expect(results.operator).to.equal('AND');
    });

    it('should query with orElse', async () => {
      const results = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .orElse();
      expect(results.operator).to.equal('OR');
    });

  it('should query with negateNext', async () => {
        const results = await store.openSession()
          .query<Universal>({
            indexName: 'Universals',
            WaitForNonStaleResults: true
          })
          .negateNext();
    expect(results.negate).to.equal(true);
      });

  it('should query with whereIn', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereIn('name', 'withNesting').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query with whereGreaterThan', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereGreaterThan('order', 2).get();
    expect(results[0]).to.be.a('object');
  });

  it('should query with whereLessThan', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereLessThan<number>('order', 6).get();
    expect(results[0]).to.be.a('object');
  });

  it('should query by startsWith', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .startsWith<string>('name','wi').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query by endsWith', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .endsWith<string>('name','ing').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query by search', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .search('name', 'withNesting', 'order', 1, 2).get();
    expect(results[0]).to.include({'name': 'withNesting'});
  });

  it('should query with orderBy', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .orderBy<string>('name', 'ASC').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query with orderByDESC', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .orderBy<string>('name', 'DESC').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query with selectFields', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .selectFields('id').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query with whereIsNull', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereIsNull('nullField', 'null').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query with whereNotNull', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
    .whereNotNull('nullField', 'null').get();
    expect(results).to.have.lengthOf(0);
  });

  it('should query with whereGreaterThanOrEqual', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereGreaterThanOrEqual<number>('order',6, 'name', 'withNesting').get();
    expect(results[0]).to.be.a('object');
  });

  it('should query with whereLessThanOrEqual', async () => {
    const results: Universal[] = await  store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereLessThanOrEqual<number>('order',6, 'name', 'withNesting').get();
     expect(results[0]).to.be.a('object');
  });

  it('should query by between', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereBetween('order',1, 5).get();
    expect(results[0]).to.be.a('object');
  });

  it('should query by whereBetweenOrEqual', async () => {
    const results: Universal[] = await store.openSession()
      .query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      })
      .whereBetweenOrEqual('order',1, 5, 'name', 'withNesting').get();
    expect(results[0]).to.be.a('object');
  });

  });
});
