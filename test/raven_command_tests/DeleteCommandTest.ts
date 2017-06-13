/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {DeleteDocumentCommand} from "../../src/Database/Commands/DeleteDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IRavenObject} from "../../src/Database/IRavenObject";

describe('Delete command test', () => {
  let requestsExecutor: RequestsExecutor;
  let response: IRavenResponse, otherResponse: IRavenResponse;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => requestsExecutor
    .execute(new PutDocumentCommand('products/101', {'Name': 'test', '@metadata': {}}))
    .then((result: IRavenResponse) => {
      response = result;

      return requestsExecutor.execute(new PutDocumentCommand('products/102', {'Name': 'test', '@metadata': {}}));
    })
    .then((result: IRavenResponse) => otherResponse = result)
  );

  describe('Delete()', () => {
    it('should delete with no etag', async () => {
      let command: DeleteDocumentCommand = new DeleteDocumentCommand('products/10');

      return requestsExecutor
        .execute(command)
        .then((result: IRavenResponse) => expect(result).not.to.be.null)
    });

    it('should delete with etag', async() => {
      let command2: DeleteDocumentCommand = new DeleteDocumentCommand('products/102', otherResponse.etag);

      return requestsExecutor
        .execute(command2)
        .then((result: IRavenResponse) => expect(result).not.to.be.null)
    });

    it('should fail delete', async() => expect(
      requestsExecutor
        .execute(new DeleteDocumentCommand('products/101', response.etag + 10))
      ).should.be.rejected
    )
  })
});
