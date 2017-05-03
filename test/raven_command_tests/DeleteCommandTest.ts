/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {DeleteDocumentCommand} from "../../src/Database/Commands/DeleteDocumentCommand";
import {IRavenResponse, IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IHash} from "../../src/Utility/Hash";

describe('Delete command test', () => {
  let requestsExecutor: RequestsExecutor;
  let response: IRavenResponse, otherResponse: IRavenResponse;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IHash);
  });

  beforeEach((done: MochaDone) => {
    requestsExecutor.execute(new PutDocumentCommand('products/101', {'Name': 'test', '@metadata': {}}))
      .then((result: IRavenResponse) => {
        response = result as IRavenResponse;

        return requestsExecutor.execute(new PutDocumentCommand('products/102', {'Name': 'test', '@metadata': {}}));
      })
      .then((result: IRavenResponse) => {
        otherResponse = result as IRavenResponse;
        done();
      })
  });

  describe('Delete()', () => {
    it('should delete with no etag', (done: MochaDone) => {
      let command: DeleteDocumentCommand = new DeleteDocumentCommand('products/10');

      requestsExecutor.execute(command).then((result: IRavenResponse) => {
        expect(result).not.to.be.null;
        done();
      })
    });

    it('should delete with etag', (done: MochaDone) => {
      let command2: DeleteDocumentCommand = new DeleteDocumentCommand('products/102', otherResponse.etag);

      requestsExecutor.execute(command2).then((result: IRavenResponse) => {
        expect(result).not.to.be.null;
        done();
      })
    });

    it('should fail delete', (done: MochaDone) => {
      expect(requestsExecutor.execute(new DeleteDocumentCommand('products/101', response.etag + 10))).should.be.rejected.and.notify(done);

    })
  })
});
