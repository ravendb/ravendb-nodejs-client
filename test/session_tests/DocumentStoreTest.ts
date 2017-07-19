/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentType} from "../../src/Documents/Conventions/DocumentConventions";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Foo, Product} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('Document store test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let defaultDatabase: string, defaultUrl: string;

  const resolveDocumentType = (plainDocument: object, key?: string, specifiedType?: DocumentType): string => {
    const propsMap = {
      "Product": ['name', 'uid', 'order']
    };

    if (!specifiedType && !key) {
      return Object.keys(propsMap).find((documentType: string): boolean => 
        propsMap[documentType].every((prop: string) => prop in plainDocument)
      );
    }
  };

  beforeEach(function (): void {
    ({defaultDatabase, defaultUrl, requestExecutor} = (this.currentTest as IRavenObject));
  });

  beforeEach(() => store = DocumentStore.create(defaultUrl, defaultDatabase).initialize());

  describe('Store', () => {
    it('should store without key', async () => {
      let foo: Foo;
      session = store.openSession({requestExecutor});

      foo = new Foo(null, 'test', 10);
      await session.store<Foo>(foo);
      await session.saveChanges();

      foo = await store.openSession({requestExecutor}).load<Foo>(foo.id, Foo);
      expect(foo.name).to.equals('test');
    });

    it('should store with key', async () => {
      let foo: Foo;    
      const key: string = 'testingStore/1';
      session = store.openSession({requestExecutor});

      foo = new Foo(key, 'test', 20);
      await session.store<Foo>(foo);
      await session.saveChanges();

      foo = await store.openSession({requestExecutor}).load<Foo>(key, Foo);
      expect(foo.order).to.equals(20);      
    });

    it('should fail after delete', async () => {
      let foo: Foo;
      const key: string = 'testingStore';
      session = store.openSession({requestExecutor});

      foo = new Foo(key, 'test', 20);
      await session.store<Foo>(foo);
      await session.saveChanges();   
      
      session = store.openSession({requestExecutor});
      await session.delete<Foo>(key);   
      await expect(session.store<Foo>(foo)).to.be.rejected;      
    });

    it('should generate id and set collection', async () => {
      let product: Product = new Product(null, "New Product");    
      session = store.openSession({requestExecutor});
      
      product = await session.store<Product>(product);
      await session.saveChanges();

      expect(product.id).to.match(/^Product\/\d+(\-\w)?$/);

      product = await store.openSession({requestExecutor}).load<Product>(product.id, Product);
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');  
      expect(product['@metadata']['@collection']).to.equals('Products');      
    });

    it('should set id and collection on plain object with specified key or key prefix', async () => {
      let product: Product = <Product>{id: null, name: "New Product"};    
      session = store.openSession({requestExecutor});
      
      await session.store<Product>(product, 'Product/1');
      await session.saveChanges();

      expect(product.id).to.equals('Product/1');

      product = await store.openSession({requestExecutor}).load<Product>(product.id);
      
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');  
      expect(product['@metadata']['@collection']).to.equals('Products');      
   
      product = <Product>{id: null, name: "New Product"};    
      session = store.openSession({requestExecutor});
      
      await session.store<Product>(product, 'Products/');
      await session.saveChanges();

      expect(product.id).to.match(/^Product\/\d+(\-\w)?$/);

      product = await store.openSession({requestExecutor}).load<Product>(product.id);
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');  
      expect(product['@metadata']['@collection']).to.equals('Products');      
    });

    it('should set id and collection on plain object with prefilled document type or metadata', async () => {
      let product: Product = <Product>{id: null, name: "New Product"};    
      session = store.openSession({requestExecutor});
      
      await session.store<Product>(product, null, "Product");
      await session.saveChanges();

      expect(product.id).to.match(/^Product\/\d+(\-\w)?$/);

      product = await store.openSession({requestExecutor}).load<Product>(product.id);
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');  
      expect(product['@metadata']['@collection']).to.equals('Products');      

      product = <Product>{id: null, name: "New Product", "@metadata": {"Raven-Node-Type": "Product"}};    
      session = store.openSession({requestExecutor});
      
      await session.store<Product>(product);
      await session.saveChanges();

      expect(product.id).to.match(/^Product\/\d+(\-\w)?$/);

      product = await store.openSession({requestExecutor}).load<Product>(product.id);
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');  
      expect(product['@metadata']['@collection']).to.equals('Products');      
   
      product = <Product>{id: null, name: "New Product", "@metadata": {"@collection": "Products"}};    
      session = store.openSession({requestExecutor});
      
      await session.store<Product>(product);
      await session.saveChanges();

      expect(product.id).to.match(/^Product\/\d+(\-\w)?$/);

      product = await store.openSession({requestExecutor}).load<Product>(product.id);
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');  
      expect(product['@metadata']['@collection']).to.equals('Products'); 
    });

    it('should set id and collection on plain object converted via document type resolver', async () => {
      let product: Product = <Product>{id: null, name: "New Product", uid: null, order: null};    

      store.conventions.addDocumentInfoResolver({ resolveDocumentType });
      session = store.openSession({requestExecutor});
      
      await session.store<Product>(product);
      await session.saveChanges();

      expect(product.id).to.match(/^Product\/\d+(\-\w)?$/);

      product = await store.openSession({requestExecutor}).load<Product>(product.id);
      expect(product['@metadata']['Raven-Node-Type']).to.equals('Product');  
      expect(product['@metadata']['@collection']).to.equals('Products');      
    });

    it('should set @empty collection and uuid() as id on plain object which has unresolved document type', async () => {
      let product: Product = <Product>{id: null, name: "New Product"};    

      session = store.openSession({requestExecutor});      
      await session.store<Product>(product);
      await session.saveChanges();

      expect(product.id).to.match(/^[a-f0-9]{8}\-[a-f0-9]{4}\-[a-f0-9]{4}\-[a-f0-9]{4}\-[a-f0-9]{12}$/);

      product = await store.openSession({requestExecutor}).load<Product>(product.id);
      expect(product['@metadata']['Raven-Node-Type']).to.not.exist;  
      expect(product['@metadata']['@collection']).to.equals('@empty');      
    });

    it('shouldn\'t set id on plain object without id attribute defined', async () => {
      let product: Product = <Product>{name: "New Product"};    

      session = store.openSession({requestExecutor});      
      await session.store<Product>(product);
      await session.saveChanges();

      expect(product.id).to.be.empty;      
    });
  });
});

