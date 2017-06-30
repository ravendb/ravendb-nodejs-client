/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Product, Company, Order} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('Document load test', () => {
  let store: IDocumentStore;
  let product: Product;
  let products: Product[];
  let order: Order;
  let company: Company;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl, requestExecutor} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase).initialize();
    session = store.openSession({requestExecutor});

    let product101: Product = new Product("Products/101", "test");
    let product10: Product = new Product("Products/10", "test");
    order = new Order("Orders/105", "testing_order", 92, "Products/101");
    company = new Company("companies/1", "test", new Product(null, "testing_nested"));

    await session.store<Product>(product101);
    await session.store<Product>(product10);
    await session.store<Order>(order);
    await session.store<Company>(company);
    await session.saveChanges();
  });

  describe('Document Load', () => {
    it('should load existing document', async () => {
      session = store.openSession({requestExecutor});
      product = await session.load<Product>("Products/101");

      expect(product.name).to.equals('test');
    });

    it('should not load missing document', async () => {
      session = store.openSession({requestExecutor});
      product = await session.load<Product>("Products/0");

      expect(product).to.be.null;      
    });

    it('should load few documents', async () => {
      session = store.openSession({requestExecutor});
      products = await session.load<Product>(["Products/101", "Products/10"]);
      
      expect(products).to.have.lengthOf(2);
    });

    it('should load few documents with duplicate id', async () => {
      session = store.openSession({requestExecutor});
      products = await session.load<Product>(["Products/101", "Products/101", "Products/101"]);

      expect(products).to.have.lengthOf(3);

      for (let product of products) {
        expect(product).not.to.equals(null);
      }
    });

    it('should load track entity', async () => {
      session = store.openSession({requestExecutor});
      product = await session.load<Product>("Products/101");

      expect(product).to.be.an('object');
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');      
    });

    it('should load track entity with nested object', async () => {
      session = store.openSession({requestExecutor});
      company = await session.load<Company>("companies/1");

      expect(company).to.be.an('object');
      expect(company.product).to.be.an('object');      
      expect(company.product).to.have.property('name', 'testing_nested');
    });

    it('should load track entity with object type', async () => {
      session = store.openSession({requestExecutor});
      product = await session.load<Product>("Products/101", Product);

      expect(product).to.be.an.instanceOf(Product);
    });

    it('should load track entity with object type and nested object types', async () => {
      session = store.openSession({requestExecutor});
      company = await session.load<Company>("companies/1", Company, null, {product: Product});

      expect(company).to.be.an.instanceOf(Company);
      expect(company.product).to.be.an.instanceOf(Product);
    });

    it('should load with includes', async () => {
      session = store.openSession({requestExecutor});
      
      await session.load<Order>("Orders/105", Order, ["product_id"]);
      await session.load<Product>("Products/101");

      expect(session.numberOfRequestsInSession).to.equals(1);
    });
  });
});