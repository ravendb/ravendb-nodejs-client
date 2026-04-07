import assert from "node:assert";
import { NextHiloCommand } from "../../../../src/Documents/Identity/Commands/NextHiloCommand.js";
import { DocumentConventions } from "../../../../src/Documents/Conventions/DocumentConventions.js";

describe("NextHiloCommand", function () {

    it("should include lastMax=0 in URL when lastRangeMax is 0", function () {
        const conventions = DocumentConventions.defaultConventions;
        const cmd = new NextHiloCommand("users", 0, new Date(), "/", 0, conventions);
        const request = cmd.createRequest({ url: "http://localhost:8080", database: "testdb" } as any);
        assert.ok(request.uri.includes("lastMax=0"),
            `URL should contain 'lastMax=0', got: ${request.uri}`);
    });

    it("should include lastMax when lastRangeMax is a positive number", function () {
        const conventions = DocumentConventions.defaultConventions;
        const cmd = new NextHiloCommand("users", 32, new Date(), "/", 1024, conventions);
        const request = cmd.createRequest({ url: "http://localhost:8080", database: "testdb" } as any);
        assert.ok(request.uri.includes("lastMax=1024"),
            `URL should contain 'lastMax=1024', got: ${request.uri}`);
    });
});
