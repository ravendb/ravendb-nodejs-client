import assert from "node:assert";
import { CONSTANTS, IDocumentStore, PatchCommandData, PatchRequest } from "../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("PatchWithCrypto", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeCompany(name: string, removeTypeMetadata = false) {
        const session = store.openSession();
        const company = Object.assign(new Company(), { name });
        await session.store(company, "companies/1");
        if (removeTypeMetadata) {
            delete session.advanced.getMetadataFor(company)[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE];
        }
        await session.saveChanges();
    }

    async function patchCompany(script: string) {
        const session = store.openSession();
        session.advanced.defer(new PatchCommandData("companies/1", null, PatchRequest.forScript(script)));
        await session.saveChanges();
    }

    async function loadCompany() {
        const session = store.openSession();
        return session.load("companies/1", Company);
    }

    it("can generate guid via patch", async () => {
        await storeCompany("The Wall");

        await patchCompany("this.externalId = crypto.randomUUID();");

        const company = await loadCompany();
        assert.match(company.externalId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("can get random values", async () => {
        await storeCompany("The Wall");

        await patchCompany("this.random = crypto.getRandomValuesBase64(32);");

        const company = await loadCompany();
        assert.ok(company.random);

        const buf = Buffer.from(company.random, "base64");
        assert.strictEqual(buf.length, 32);
        assert.ok(!buf.every(x => x === 0), "Cannot get random string with all zeros");
    });

    it("can digest", async () => {
        await storeCompany("test");

        await patchCompany(`
var data = 'Hello world';
var hash = crypto.digest('SHA-256', data);
this.hash = hash;
`);

        const company = await loadCompany();
        const buf = Buffer.from(company.hash, "base64");
        assert.strictEqual(buf.length, 32);
        assert.strictEqual(company.hash, "ZOyIygCyaOW6GjVnihtTFtIS9PNmskdyMlNKiuyjfzw=");
    });

    it("can sign and verify", async () => {
        await storeCompany("test");

        await patchCompany(`
var key = crypto.getRandomValuesBase64(64);
var data = 'some message';

var sig = crypto.sign('SHA-256', key, data);
this.signature = sig;

var valid = crypto.verify('SHA-256', key, sig, data);
this.valid = valid;

var invalid = crypto.verify('SHA-256', key, sig, 'other');
this.invalid = invalid;
`);

        const company = await loadCompany();
        assert.strictEqual(company.valid, true);
        assert.strictEqual(company.invalid, false);
        assert.ok(company.signature.length > 0);
    });

    it("can encrypt and decrypt", async () => {
        await storeCompany("test", true);

        await patchCompany(`
var key = crypto.getRandomValuesBase64(32);
var iv = crypto.getRandomValuesBase64(12);

var plain = 'Secret Message';
var encrypted = crypto.encryptAesGcm(iv, key, plain);
this.encrypted = encrypted;

this.decryptedString = crypto.decryptAesGcm(iv, key, encrypted, 'string');
`);

        const session = store.openSession();
        const company = await session.load<any>("companies/1");
        assert.strictEqual(company.decryptedString, "Secret Message");
    });
});

class Company {
    public externalId: string;
    public name: string;
    public random: string;
    public hash: string;
    public signature: string;
    public encrypted: string;
    public valid: boolean;
    public invalid: boolean;
    public decryptedString: string;
}
