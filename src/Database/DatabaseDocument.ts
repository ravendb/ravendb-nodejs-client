import {IJsonSerializable} from "../Json/IJsonSerializable";
import {IRavenObject} from "./IRavenObject";

export class DatabaseDocument implements IJsonSerializable {
  protected secureSettings: {};
  protected disabled: boolean;
  private _databaseId: string;
  private _settings: {};

  constructor(databaseId: string, settings: IRavenObject = {}, secureSettings: IRavenObject = {}, disabled: boolean = false) {
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

  toJson(): object {
    return {
      "Disabled": this.disabled,
      "SecuredSettings": this.secureSettings,
      "Settings": this.settings
    };
  }
}