/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../../src/Documents/DocumentStore';
import * as BluebirdPromise from 'bluebird';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Product, Company, Order} from "../BaseTest";

describe('Document load test', () => {
  let store: IDocumentStore;
  let product: Product;
  let products: Product[];
  let order: Order;
  let company: Company;
  let session: IDocumentSession;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase).initialize();
    session = store.openSession();

    let product101: Product = session.create<Product>(new Product("products/101", "test"));
    let product10: Product = session.create<Product>(new Product("products/10", "test"));
    order = session.create<Order>(new Order("orders/105", "testing_order", 92, "products/101"));
    company = session.create<Company>(new Company("company/1", "test", new Product(null, "testing_nested")));

    await session.store<Product>(product101);
    await session.store<Product>(product10);
    await session.store<Order>(order);
    await session.store<Company>(company);
    await session.saveChanges();
  });

  describe('Document Load', () => {
    it('should load existing document', async () => {
      session = store.openSession();
      product = await session.load<Product>("products/101");

      expect(product.name).to.equals('test');
    });

    it('should not load missing document', async () => {
      session = store.openSession();
      product = await session.load<Product>("products/0");

      expect(product).to.equals(null);      
    });

    it('should load few documents', async () => {
      session = store.openSession();
      products = await session.load<Product>(["products/101", "products/10"]);
      
      expect(products).to.have.lengthOf(2);
    });

    it('should load few documents with duplicate id', async () => {
      session = store.openSession();
      products = await session.load<Product>(["products/101", "products/101", "products/101"]);

      expect(products).to.have.lengthOf(3);

      for (let product of products) {
        expect(product).not.to.equals(null);
      }
    });

    it('should load track entity', async () => {
      session = store.openSession();
      product = await session.load<Product>("products/101");

      expect(product).to.be.an('object');
      expect(product['@metadata']['@object_type']).to.equals('Product');      
    });

    it('should load track entity with nested object', async () => {
      session = store.openSession();
      company = await session.load<Company>("company/1");

      expect(company).to.be.an('object');
      expect(company['@metadata']['@object_type']).to.equals('Company');      
      expect(company.product['@metadata']['@object_type']).to.equals('Product');      
    });

    it('should load track entity with object type', async () => {
      session = store.openSession();
      product = await session.load<Product>("products/101", Product);

      expect(product).to.be.an.instanceOf(Product);
    });

    it('should load track entity with object type and nested object types', async () => {
      session = store.openSession();
      company = await session.load<Company>("company/1", Company, null, {product: Product});

      expect(company).to.be.an.instanceOf(Company);
      expect(company.product).to.be.an.instanceOf(Product);
    });

    it('should load with includes', async () => {
      session = store.openSession();
      
      await session.load<Order>("orders/105", Order, ["product_id"]);
      await session.load<Product>("products/101");

      expect(session.numberOfRequestsInSession).to.equals(1);
    });
  });
});