
import {IDocumentStore} from './IDocumentStore';
import {IDatabaseDocument} from "./IDatabaseDocument";
import {IJsonSerializable} from "../Json/IJsonSerializable";

export class DatabaseDocument implements IJsonSerializable {
    public databaseId: string;
    public settings?: {};
    public secureSettings?: {};
    public disabled: boolean;

    constructor(databaseId: string, settings: {},secureSettings: {}, disabled: boolean) {
        this.databaseId = databaseId;
        this.settings = settings || {};
        this.secureSettings = secureSettings || {};
        this.disabled = disabled;
    }

    def to_json(self):
    return {"Disabled": self.disabled, "SecuredSettings": self.secured_settings, "Settings": self.settings}

}