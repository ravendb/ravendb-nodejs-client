export class SessionInfo {

    private _sessionId: number;

    constructor(sessionId: number) {
        this._sessionId = sessionId;
    }

    public get sessionId() {
        return this._sessionId;
    }
}
