/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {DeleteDocumentCommand} from "../../src/Database/Commands/DeleteDocumentCommand";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {BatchCommand} from "../../src/Database/Commands/BatchCommand";
import {PatchCommand} from "../../src/Database/Commands/PatchCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";

describe('DocumentSession', () => {
  let executor: RequestsExecutor;
  let putCommand1: PutDocumentCommand;
  let putCommand2: PutDocumentCommand;
  let deleteCommand: DeleteDocumentCommand;
  let scriptedPatchCommand: PatchCommand;

  beforeEach((done: MochaDone) => {
    putCommand1 = new PutDocumentCommand('products/999', {'Name': 'tests', 'Category': 'testing'},);
    putCommand2 = new PutDocumentCommand('products/1000', {'Name': 'tests', 'Category': 'testing'},);
    deleteCommand = new DeleteDocumentCommand('product/1000');
    scriptedPatchCommand = new PatchCommand('products/999', new PatchRequest("this.Name = 'testing';"));
    done()
  });

  describe('Batch request', () => {
    it('should be success with one command', (done: MochaDone) => {
      executor.execute(new BatchCommand([putCommand1])).then((result) => {
        expect(result).to.be.lengthOf(1);
        done()
      })
    });

    it('should be success with multi commands', (done: MochaDone) => {
      executor.execute(new BatchCommand([putCommand1, putCommand2, deleteCommand])).then((result) => {
        expect(result).to.be.lengthOf(3);
        done()
      })
    });

    it('should be a scripted patch', (done: MochaDone) => {
      executor.execute(new BatchCommand([putCommand1, scriptedPatchCommand])).then((result) => {
        expect(result["Results"][0]["Name"]).to.equals('testing');
        done()
      })
    });

    it('should fail the test', (done: MochaDone) => {
      expect(executor.execute(new BatchCommand([putCommand1, putCommand2]))).to.be.rejected.and.notify(done)
    });
  })
});

