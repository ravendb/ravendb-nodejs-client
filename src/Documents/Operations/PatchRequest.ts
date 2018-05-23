export class PatchRequest {
    public script: string;
    public values: { [key: string]: any };

    public static forScript(script: string) {
        return Object.assign(
            new PatchRequest(),
            { script }
        );
    }
}