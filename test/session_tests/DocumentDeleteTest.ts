/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {Product} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('Document delete test', () => {
  const ids: number[] = [101, 10, 106, 107];
  
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let defaultUrl: string;
  let currentDatabase: string;
  let changeVector: string[];

  beforeEach(function(): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    session = store.openSession();

    for (let id of ids) {
      let product: Product = new Product(`Product/${id}`, 'test');
      await session.store<Product>(product);
    }

    await session.saveChanges();

    let products: Product[] = await store.openSession()
      .load<Product>(ids.map((id: number): string => `Product/${id}`), Product);

    changeVector = products.map((product: Product) => product['@metadata']['@change-vector']);
  });

  describe('Document delete', () => {
    it('should delete with key with save session', async() => {
      let product: Product;
      const key: string = "Product/101";
      session = store.openSession();

      await session.delete<Product>(key);
      await session.saveChanges();
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should delete with key without save session', async() => {
      let product: Product;
      const key: string = "Product/10";
      session = store.openSession();

      await session.delete<Product>(key);
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should fail trying delete document by key after it has been changed', async() => {
      let product: Product;
      const key: string = "Product/106";
      session = store.openSession();

      product = await session.load<Product>(key, Product);
      product.name = "testing";

      await expect(session.delete<Product>(key)).to.be.rejected;
    });

    it('should delete document after it has been changed and save session', async() => {
      let product: Product;
      const key: string = "Product/107";
      session = store.openSession();

      product = await session.load<Product>(key, Product);
      product.name = "testing";

      await session.delete<Product>(product);
      await session.saveChanges();
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should delete with correct changeVector', async() => {
      session = store.openSession();

      for (let i: number = 0; i < ids.length; i++) {
        await session.delete<Product>(`Product/${ids[i]}`, changeVector[i]);
      }

      await expect(session.saveChanges()).to.be.fulfilled;
    });

    it('should fail delete when changeVector mismatches', async() => {
      session = store.openSession();

      for (let i: number = 0; i < ids.length; i++) {

          await session.delete<Product>(`Product/${ids[i]}`, `${changeVector[i]}:BROKEN:VECTOR`);
      }

      await expect(session.saveChanges()).to.be.rejected;
    });
  })
});