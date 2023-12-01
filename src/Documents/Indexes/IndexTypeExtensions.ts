import { IndexType } from "./Enums";

export class IndexTypeExtensions {

    public static isMap(type: IndexType): boolean {
        return type === "Map"
            || type === "AutoMap"
            || type === "JavaScriptMap";
    }

    public static isMapReduce(type: IndexType): boolean {
        return type === "MapReduce"
            || type === "AutoMapReduce"
            || type === "JavaScriptMapReduce";
    }

    public static isAuto(type: IndexType): boolean {
        return type === "AutoMap" || type === "AutoMapReduce";
    }

    public static isStatic(type: IndexType): boolean {
        return type === "Map"
            || type === "MapReduce"
            || type === "JavaScriptMap"
            || type === "JavaScriptMapReduce";
    }

    public static isJavaScript(type: IndexType): boolean {
        return type === "JavaScriptMap" || type === "JavaScriptMapReduce";
    }
}
