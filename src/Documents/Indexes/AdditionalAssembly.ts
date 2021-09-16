import { throwError } from "../../Exceptions";
import { StringUtil } from "../../Utility/StringUtil";


export class AdditionalAssembly {

    public assemblyName: string;
    public assemblyPath: string;
    public packageName: string;
    public packageVersion: string;
    public packageSourceUrl: string;
    public usings: string[];

    private constructor() {
    }

    public static onlyUsings(usings: string[]) {
        if (!usings || usings.length === 0) {
            throwError("InvalidArgumentException", "Using cannot be null or empty");
        }

        const additionalAssembly = new AdditionalAssembly();
        additionalAssembly.usings = usings;
        return additionalAssembly;
    }

    public static fromRuntime(assemblyName: string, usings: string[] = null) {
        if (StringUtil.isNullOrWhitespace(assemblyName)) {
            throwError("InvalidArgumentException", "AssemblyName cannot be null or whitespace.");
        }

        const additionalAssembly = new AdditionalAssembly();
        additionalAssembly.assemblyName = assemblyName;
        additionalAssembly.usings = usings;
        return additionalAssembly;
    }

    public static fromPath(assemblyPath: string, usings: string[] = null) {
        if (StringUtil.isNullOrWhitespace(assemblyPath)) {
            throwError("InvalidArgumentException", "AssemblyPath cannot be null or whitespace.");
        }

        const additionalAssembly = new AdditionalAssembly();
        additionalAssembly.assemblyPath = assemblyPath;
        additionalAssembly.usings = usings;
        return additionalAssembly;
    }

    public static fromNuGet(packageName: string, packageVersion: string, packageSourceUrl: string = null, usings: string[] = null) {
        if (StringUtil.isNullOrWhitespace(packageName)) {
            throwError("InvalidArgumentException", "PackageName cannot be null or whitespace.");
        }
        if (StringUtil.isNullOrWhitespace(packageVersion)) {
            throwError("InvalidArgumentException", "PackageVersion cannot be null or whitespace.");
        }

        const additionalAssembly = new AdditionalAssembly();
        additionalAssembly.packageName = packageName;
        additionalAssembly.packageVersion = packageVersion;
        additionalAssembly.packageSourceUrl = packageSourceUrl;
        additionalAssembly.usings = usings;
        return additionalAssembly;
    }
}