/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PatchCommand} from "../../src/Database/Commands/PatchCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";

describe('Patch command test', () => {
  let requestsExecutor: RequestsExecutor;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IRavenObject);
  });

  beforeEach((done: MochaDone) => {
    requestsExecutor.execute(
      new PutDocumentCommand("products/10", {"Name": "test", "@metadata": {}})
    )
    .then(() => done());
  });

  describe('Patch request', () => {
    it('should patch success ignoring missing', (done: MochaDone) => {
      requestsExecutor
        .execute(new PatchCommand('products/10', new PatchRequest("this.Name = 'testing'")))
        .then((result: IRavenResponse) => {
          expect(result).not.to.be.null;
          done();
        });
    });

    it('should patch success not ignoring missing', (done: MochaDone) => {
      requestsExecutor
        .execute(new PatchCommand('products/10', new PatchRequest("this.Name = 'testing'"), {skipPatchIfEtagMismatch: true}))
        .then((result: IRavenResponse) => {
          expect(result).not.to.be.null;
          done();
        });
    });

    it('should patch fail not ignoring missing', (done: MochaDone) => {
      expect(requestsExecutor.execute(
        new PatchCommand('products/10', new PatchRequest("this.Name = 'testing'"), {skipPatchIfEtagMismatch: false})
      )).to.be.rejected.and.notify(done);
    });
  })
});


