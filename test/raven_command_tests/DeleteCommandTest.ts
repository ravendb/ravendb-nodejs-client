/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import {DeleteDocumentCommand} from "../../src/Database/Commands/DeleteDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IRavenObject} from "../../src/Database/IRavenObject";

describe('Delete command test', () => {
  let requestExecutor: RequestExecutor;
  let etag: number, otherEtag: number;

  beforeEach(function(): void {
    ({requestExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => requestExecutor
    .execute(new PutDocumentCommand('products/101', {'Name': 'test', '@metadata': {}}))
    .then(() => requestExecutor.execute(new GetDocumentCommand('products/101')))
    .then((response: IRavenResponse) => etag = response.Results[0]['@metadata']['@etag'])
    .then(() => requestExecutor.execute(new PutDocumentCommand('products/102', {'Name': 'test', '@metadata': {}})))    
    .then(() => requestExecutor.execute(new GetDocumentCommand('products/102')))
    .then((response: IRavenResponse) => otherEtag = response.Results[0]['@metadata']['@etag'])
  );

  describe('Delete()', () => {
    it('should delete with no etag', async () => {
      let command: DeleteDocumentCommand = new DeleteDocumentCommand('products/101');

      await expect(requestExecutor.execute(command)).to.be.fulfilled;
    });

    it('should delete with etag', async() => {
      let command2: DeleteDocumentCommand = new DeleteDocumentCommand('products/102', otherEtag);

      await expect(requestExecutor.execute(command2)).to.be.fulfilled;
    });

    it('should fail delete if etag mismatches', async() => expect(
      requestExecutor
        .execute(new DeleteDocumentCommand('products/101', etag + 10))
      ).to.be.rejected
    )
  })
});
