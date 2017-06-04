/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import * as BluebirdPromise from 'bluebird';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {BatchCommand} from "../../src/Database/Commands/BatchCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {PutCommandData} from "../../src/Database/Commands/Data/PutCommandData";
import {DeleteCommandData} from "../../src/Database/Commands/Data/DeleteCommandData";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {PatchCommandData} from "../../src/Database/Commands/Data/PatchCommandData";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";

describe('Batch command test', () => {
  let requestsExecutor: RequestsExecutor;
  let putCommand1: PutCommandData;
  let putCommand2: PutCommandData;
  let deleteCommand: DeleteCommandData;
  let scriptedPatchCommand: PatchCommandData;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(() => {
    const metadata: object = {'Raven-Node-Type': 'Document', '@collection': 'products', 'object_type': 'product'};

    putCommand1 = new PutCommandData('products/999', {'Name': 'tests', 'Category': 'testing'}, null, metadata);
    putCommand2 = new PutCommandData('products/1000', {'Name': 'tests', 'Category': 'testing'}, null, metadata);
    deleteCommand = new DeleteCommandData('products/1000');
    scriptedPatchCommand = new PatchCommandData('products/999', new PatchRequest("this.Name = 'testing';"));
  });

  describe('Batch request', () => {
    it('should be success with one command', async () => requestsExecutor
      .execute(new BatchCommand([putCommand1]))
      .then((result: IRavenResponse[]) => expect(result).to.be.lengthOf(1))
    );

    it('should be success with multi commands', async () => requestsExecutor
      .execute(new BatchCommand([putCommand1, putCommand2, deleteCommand]))
      .then((result: IRavenResponse[]) => expect(result).to.be.lengthOf(3))
    );

    it('should be success with a scripted patch', async () => requestsExecutor
        .execute(new BatchCommand([putCommand1, scriptedPatchCommand]))
        .then((): BluebirdPromise.Thenable<IRavenResponse> => requestsExecutor
        .execute(new GetDocumentCommand('products/999')))
        .then((result: IRavenResponse) => expect((result).Results[0].Name).to.equals('testing'))
    );

    it('should fail the test', (done: MochaDone) => expect(
        requestsExecutor.execute(new BatchCommand([putCommand1, putCommand2, null]))
      ).to.be.rejected
    );
  })
});

