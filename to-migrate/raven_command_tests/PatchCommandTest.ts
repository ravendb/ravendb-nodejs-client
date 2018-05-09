/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {PatchOperation} from "../../src/Database/Operations/PatchOperation";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";

describe('Patch command test', () => {
  const id: string = "Products/10";
  let requestExecutor: RequestExecutor;
  let changeVector: string;
  let store: IDocumentStore;

  beforeEach(function(): void {
    ({requestExecutor, store} = this.currentTest as IRavenObject);
  });

  beforeEach(async () => requestExecutor
    .execute(new PutDocumentCommand(id, {"Name": "test", "@metadata": {}}))
    .then(() => requestExecutor.execute(new GetDocumentCommand(id)))
    .then((result: IRavenResponse) => changeVector = result.Results[0]["@metadata"]["@change-vector"])
  );

  describe('Patch request', () => {
    it('should patch success ignoring missing', async() => store.operations
      .send(new PatchOperation(id, new PatchRequest("this.Name = 'testing'")))
      .then((result: IRavenResponse) => {
        expect(result).to.haveOwnProperty('Document');
        expect(result.Document).to.be.a('object');
      })
    );

    it('should patch success not ignoring missing', async() => store.operations
      .send(new PatchOperation(id, new PatchRequest("this.Name = 'testing'"), {changeVector: changeVector + 1, skipPatchIfChangeVectorMismatch: true}))
      .then((result: IRavenResponse) => expect(result).to.not.haveOwnProperty('Document'))
    );

    it('should patch fail not ignoring missing', async () => expect(store.operations
        .send(new PatchOperation(id, new PatchRequest("this.Name = 'testing'"), {changeVector: changeVector + 1, skipPatchIfChangeVectorMismatch: false}))
      ).to.be.rejected
    );
  })
});


