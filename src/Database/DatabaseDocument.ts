import {IJsonable} from "../Typedef/Contracts";
import {IRavenObject} from "../Typedef/IRavenObject";

export class DatabaseDocument implements IJsonable {
  protected secureSettings: {};
  protected disabled: boolean;
  protected encrypted: boolean;
  private _databaseId: string;
  private _settings: {};

  constructor(databaseId: string, settings: IRavenObject = {}, secureSettings: IRavenObject = {}, disabled: boolean = false, encrypted: boolean = false) {
    this._databaseId = databaseId;
    this._settings = settings;
    this.secureSettings = secureSettings;
    this.disabled = disabled;
    this.encrypted = encrypted;
  }

  public get databaseId(): string {
    return this._databaseId;
  }

  public get settings(): {} {
    return this._settings;
  }

  toJson(): object {
    return {
      "DatabaseName": this._databaseId,
      "Disabled": this.disabled,
      "Encrypted": this.encrypted,
      "SecuredSettings": this.secureSettings,
      "Settings": this.settings
    };
  }
}