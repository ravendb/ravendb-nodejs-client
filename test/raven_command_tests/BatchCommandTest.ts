/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {BatchCommand} from "../../src/Database/Commands/BatchCommand";
import {PatchCommand} from "../../src/Database/Commands/PatchCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {PutCommandData} from "../../src/Database/Commands/Data/PutCommandData";
import {DeleteCommandData} from "../../src/Database/Commands/Data/DeleteCommandData";
import {RavenCommandResponse, IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {PatchCommandData} from "../../src/Database/Commands/Data/PatchCommandData";
import {IHash} from "../../src/Utility/Hash";
import {IMetadata} from "../../src/Database/Metadata";

describe('Batch command test', () => {
  let requestsExecutor: RequestsExecutor;
  let putCommand1: PutCommandData;
  let putCommand2: PutCommandData;
  let deleteCommand: DeleteCommandData;
  let scriptedPatchCommand: PatchCommandData;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IHash);
  });

  beforeEach(() => {
    const metadata: IMetadata = {'Raven-Node-Type': 'Document', '@collection': 'products', 'object_type': 'product'};

    putCommand1 = new PutCommandData('products/999', {'Name': 'tests', 'Category': 'testing'}, null, metadata);
    putCommand2 = new PutCommandData('products/1000', {'Name': 'tests', 'Category': 'testing'}, null, metadata);
    deleteCommand = new DeleteCommandData('products/1000');
    scriptedPatchCommand = new PatchCommandData('products/999', new PatchRequest("this.Name = 'testing';"));
  });

  describe('Batch request', () => {
    it('should be success with one command', (done: MochaDone) => {
      requestsExecutor.execute(new BatchCommand([putCommand1])).then((result: RavenCommandResponse) => {
        expect(result as IRavenResponse[]).to.be.lengthOf(1);
        done()
      })
    });

    it('should be success with multi commands', (done: MochaDone) => {
      requestsExecutor.execute(new BatchCommand([putCommand1, putCommand2, deleteCommand])).then((result: RavenCommandResponse) => {
        expect(result as IRavenResponse[]).to.be.lengthOf(3);
        done()
      })
    });

    it('should be a scripted patch', (done: MochaDone) => {
      requestsExecutor.execute(new BatchCommand([putCommand1, scriptedPatchCommand])).then((result: RavenCommandResponse) => {
        expect((result as IRavenResponse).Results[0].Name).to.equals('testing');
        done()
      })
    });

    it('should fail the test', (done: MochaDone) => {
      expect(requestsExecutor.execute(new BatchCommand([putCommand1, putCommand2, null]))).to.be.rejected.and.notify(done)
    });
  })
});

