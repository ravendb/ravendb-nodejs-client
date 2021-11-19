export class GetRequest {
    private _url: string;
    private _headers: { [key: string]: string | string[] };
    private _query: string;
    private _method: string;
    private _canCacheAggressively: boolean = true;

    /**
     * Concatenated Url and Query.
     */
    public get urlAndQuery(): string {
        if (!this._query) {
            return this._url;
        }

        if (this._query[0] === "?") {
            return this._url + this._query;
        }

        return this._url + "?" + this._query;
    }

    private _content: string;

    public constructor() {
        this._headers = {};
    }

    /**
     * Request url (relative).
     */
    public get url(): string {
        return this._url;
    }

    /**
     * Request url (relative).
     */
    public set url(url: string) {
        this._url = url;
    }

    /**
     * Request headers.
     */
    public get headers(): { [key: string]: string | string[] } {
        return this._headers;
    }

    /**
     * Request headers.
     */
    public set headers(headers: { [key: string]: string | string[] }) {
        this._headers = headers;
    }

    /**
     * Query information e.g. "?pageStart=10&amp;pageSize=20".
     */
    public get query(): string {
        return this._query;
    }

    /**
     * Query information e.g. "?pageStart=10&amp;pageSize=20".
     */
    public set query(query: string) {
        this._query = query;
    }

    public get method() {
        return this._method;
    }

    public set method(method) {
        this._method = method;
    }

    public get body() {
        return this._content;
    }

    public set body(content) {
        this._content = content;
    }

    public get canCacheAggressively() {
        return this._canCacheAggressively;
    }

    public set canCacheAggressively(value: boolean) {
        this._canCacheAggressively = value;
    }
}
