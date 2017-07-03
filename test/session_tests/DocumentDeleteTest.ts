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
  const ids: number[] = [101, 10, 106, 107];
  
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let defaultDatabase: string, defaultUrl: string;  
  let eTags: number[];

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl, requestExecutor} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase).initialize();
    session = store.openSession({requestExecutor});

    for (let id of ids) {
      let product: Product = new Product(`Product/${id}`, 'test');
      await session.store<Product>(product);
    }

    await session.saveChanges();

    let products: Product[] = await store.openSession({requestExecutor})
      .load<Product>(ids.map((id: number): string => `Product/${id}`), Product);

    eTags = products.map((product: Product) => product['@metadata']['@etag']);  
  });

  describe('Document delete', () => {
    it('should delete with key with save session', async() => {
      let product: Product;
      const key: string = "Product/101";      
      session = store.openSession({requestExecutor});

      await session.delete<Product>(key);
      await session.saveChanges();
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should delete with key without save session', async() => {
      let product: Product;
      const key: string = "Product/10";
      session = store.openSession({requestExecutor});

      await session.delete<Product>(key);
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should fail trying delete document by key after it has been changed', async() => {
      let product: Product;
      const key: string = "Product/106";
      session = store.openSession({requestExecutor});

      product = await session.load<Product>(key, Product);
      product.name = "testing";

      await expect(session.delete<Product>(key)).to.be.rejected;
    });

    it('should delete document after it has been changed and save session', async() => {
      let product: Product;
      const key: string = "Product/107";
      session = store.openSession({requestExecutor});

      product = await session.load<Product>(key, Product);
      product.name = "testing";

      await session.delete<Product>(product);
      await session.saveChanges();
      product = await session.load<Product>(key, Product);

      expect(product).to.be.null;
    });

    it('should delete with correct etag', async() => {
      session = store.openSession({requestExecutor});

      for (let i: number = 0; i < ids.length; i++) {
        await session.delete<Product>(`Product/${ids[i]}`, eTags[i]);
      }
      
      await expect(session.saveChanges()).to.be.fulfilled;        
    });

    it('should fail delete when etag mismatches', async() => {
      session = store.openSession({requestExecutor});

      for (let i: number = 0; i < ids.length; i++) {
        await session.delete<Product>(`Product/${ids[i]}`, eTags[i] + 10);
      }
      
      await expect(session.saveChanges()).to.be.rejected;        
    });
  })
});