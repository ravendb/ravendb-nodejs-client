/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PatchCommand} from "../../src/Database/Commands/PatchCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('Patch command test', () => {
  const key: string = "products/10";
  let requestsExecutor: RequestsExecutor;
  let etag: number;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => requestsExecutor
    .execute(new PutDocumentCommand(key, {"Name": "test", "@metadata": {}}))
    .then(() => requestsExecutor.execute(new GetDocumentCommand(key)))
    .then((result: IRavenResponse) => etag = result.Results[0]["@metadata"]["@etag"])    
  );

  describe('Patch request', () => {
    it('should patch success ignoring missing', async() => requestsExecutor
      .execute(new PatchCommand(key, new PatchRequest("this.Name = 'testing'")))
      .then((result: IRavenResponse) => expect(result).not.to.be.undefined)
    );

    it('should patch success not ignoring missing', async() => requestsExecutor
      .execute(new PatchCommand(key, new PatchRequest("this.Name = 'testing'"), {etag: etag + 1, skipPatchIfEtagMismatch: true}))
      .then((result: IRavenResponse) => expect(result).to.be.undefined)
    );

    it('should patch fail not ignoring missing', async () => expect(requestsExecutor
        .execute(new PatchCommand(key, new PatchRequest("this.Name = 'testing'"), {etag: etag + 1, skipPatchIfEtagMismatch: false}))
      ).to.be.rejected
    );
  })
});


