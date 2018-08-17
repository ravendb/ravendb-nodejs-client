
export class ObjectUtil {

    public static clone(o) {
        return JSON.parse(JSON.stringify(o));
    }

}