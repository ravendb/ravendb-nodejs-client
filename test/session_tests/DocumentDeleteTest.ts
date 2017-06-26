/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IRavenObject} from "../../src/Database/IRavenObject";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {Product} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('Document delete test', () => {
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

    for (let id of [101, 10, 106, 107]) {
      let product: Product = new Product(`products/${id}`, 'test');
      await session.store<Product>(session.create<Product>(product));
    }

    await session.saveChanges();
  });

  describe('Document delete', () => {
    it('should delete with key with save session', async() => {
      let product: Product;
      const key: string = "products/101";      
      session = store.openSession({requestExecutor});

      await session.delete<Product>(key);
      await session.saveChanges();
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should delete with key without save session', async() => {
      let product: Product;
      const key: string = "products/10";
      session = store.openSession({requestExecutor});

      await session.delete<Product>(key);
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should fail trying delete document by key after it has been changed', async() => {
      let product: Product;
      const key: string = "products/106";
      session = store.openSession({requestExecutor});

      product = await session.load<Product>(key, Product);
      product.name = "testing";

      await expect(session.delete<Product>(key)).to.be.rejected;
    });

    it('should delete document after it has been changed and save session', async() => {
      let product: Product;
      const key: string = "products/107";
      session = store.openSession({requestExecutor});

      product = await session.load<Product>(key, Product);
      product.name = "testing";

      await session.delete<Product>(product);
      await session.saveChanges();
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });
  })
});