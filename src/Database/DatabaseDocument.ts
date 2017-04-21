import {IJsonSerializable} from "../Json/IJsonSerializable";
import {IHash} from "../Utility/Hash";

export class DatabaseDocument implements IJsonSerializable {
    protected secureSettings: {};
    protected disabled: boolean;
    private _databaseId: string;
    private _settings: {};

    constructor(databaseId: string, settings: IHash = {}, secureSettings: IHash = {}, disabled: boolean = false) {
        this._databaseId = databaseId;
        this._settings = settings;
        this.secureSettings = secureSettings;
        this.disabled = disabled;
    }

    public get databaseId(): string {
        return this._databaseId;
    }

    public get settings(): {} {
        return this._settings;
    }

    toJson(): Object {
        return {
            "Disabled": this.disabled,
            "SecuredSettings": this.secureSettings,
            "Settings": this.settings
        };
    }
}