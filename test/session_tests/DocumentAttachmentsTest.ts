/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentType, IStoredRawEntityInfo, DocumentConstructor} from "../../src/Documents/Conventions/DocumentConventions";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {Product} from "../TestClasses";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {PutAttachmentOperation} from "../../src/Database/Operations/PutAttachmentOperation";
import {GetAttachmentOperation} from "../../src/Database/Operations/GetAttachmentOperation";
import {DeleteAttachmentOperation} from "../../src/Database/Operations/DeleteAttachmentOperation";
import {AttachmentTypes} from "../../src/Database/Operations/Attachments/AttachmentType";
import {IAttachmentResult} from "../../src/Database/Operations/Attachments/AttachmentResult";
import {IAttachmentDetails} from "../../src/Database/Operations/Attachments/AttachmentDetails";
import {DocumentDoesNotExistException} from '../../src/Database/DatabaseExceptions';

describe('Document attachments test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;
  const attachment: string = '47494638396101000100800000000000ffffff21f90401000000002c000000000100010000020144003b';

  const resolveConstructor = (typeName: string): DocumentConstructor => {
    const classesMap: IRavenObject<DocumentConstructor> =
      <IRavenObject<DocumentConstructor>>require('../TestClasses');

    let foundCtor: DocumentConstructor;  

    if ((typeName in classesMap) && ('function' === 
      (typeof (foundCtor = classesMap[typeName])))
    ) {
      return foundCtor;
    } 
  };

  beforeEach(function (): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
    store.conventions.addDocumentInfoResolver({ resolveConstructor });
  });

  describe('Attachments', () => {
    it('should put attachment', async () => {
      let product: Product;
      session = store.openSession();

      product = new Product(null, 'Test Product', 10, 'a');
      await session.store<Product>(product);
      await session.saveChanges();

      await expect(store.operations.send(
        new PutAttachmentOperation(product.id, '1x1.gif', 
        Buffer.from(attachment, 'hex'), 'image/gif'))
      ).to.be.fulfilled;
    });

    it('should get attachment', async () => {
      let product: Product;
      let attachmentBuffer = Buffer.from(attachment, 'hex');
      let attachmentResult: IAttachmentResult;

      session = store.openSession();

      product = new Product(null, 'Test Product', 10, 'a');
      await session.store<Product>(product);
      await session.saveChanges();

      await store.operations.send(
        new PutAttachmentOperation(product.id, '1x1.gif', 
        attachmentBuffer, 'image/gif')
      );     

      attachmentResult = <IAttachmentResult> await store.operations.send(
        new GetAttachmentOperation(product.id, '1x1.gif', 
        AttachmentTypes.Document)
      ); 

      expect(attachmentResult.stream).to.deep.equals(attachmentBuffer);
      expect(attachmentResult.attachmentDetails.documentId).to.equals(product.id);
      expect(attachmentResult.attachmentDetails.contentType).to.equals('image/gif');
      expect(attachmentResult.attachmentDetails.name).to.equals('1x1.gif');
      expect(attachmentResult.attachmentDetails.size).to.equals(attachmentBuffer.byteLength);
    });

    it('should delete attachment', async () => {
      let product: Product;
      session = store.openSession();

      product = new Product(null, 'Test Product', 10, 'a');
      await session.store<Product>(product);
      await session.saveChanges();

      await store.operations.send(
        new PutAttachmentOperation(product.id, '1x1.gif', 
        Buffer.from(attachment, 'hex'), 'image/gif')
      );
      
      await store.operations.send(
        new DeleteAttachmentOperation(product.id, '1x1.gif')
      );

      await expect(store.operations.send(
        new GetAttachmentOperation(product.id, '1x1.gif', 
        AttachmentTypes.Document)
      )).to.be.rejectedWith(DocumentDoesNotExistException);
    }); 
  });
});

