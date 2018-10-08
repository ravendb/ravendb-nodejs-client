import { DocumentStore } from "../src";

// tslint:disable-next-line:no-var-requires
const settings = require("./settings.json");

export function getStore() {
    return new DocumentStore(settings.urls, settings.database);
}