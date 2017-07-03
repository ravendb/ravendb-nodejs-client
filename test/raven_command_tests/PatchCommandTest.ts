/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {PatchCommand} from "../../src/Database/Commands/PatchCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('Patch command test', () => {
  const id: string = "products/10";
  let requestExecutor: RequestExecutor;
  let etag: number;

  beforeEach(function(): void {
    ({requestExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => requestExecutor
    .execute(new PutDocumentCommand(id, {"Name": "test", "@metadata": {}}))
    .then(() => requestExecutor.execute(new GetDocumentCommand(id)))
    .then((result: IRavenResponse) => etag = result.Results[0]["@metadata"]["@etag"])    
  );

  describe('Patch request', () => {
    it('should patch success ignoring missing', async() => requestExecutor
      .execute(new PatchCommand(id, new PatchRequest("this.Name = 'testing'")))
      .then((result: IRavenResponse) => expect(result).not.to.be.undefined)
    );

    it('should patch success not ignoring missing', async() => requestExecutor
      .execute(new PatchCommand(id, new PatchRequest("this.Name = 'testing'"), {etag: etag + 1, skipPatchIfEtagMismatch: true}))
      .then((result: IRavenResponse) => expect(result).to.be.undefined)
    );

    it('should patch fail not ignoring missing', async () => expect(requestExecutor
        .execute(new PatchCommand(id, new PatchRequest("this.Name = 'testing'"), {etag: etag + 1, skipPatchIfEtagMismatch: false}))
      ).to.be.rejected
    );
  })
});


