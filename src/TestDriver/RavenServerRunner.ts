import * as fs from "fs";
import { ChildProcess, spawn } from "child_process";
import { RavenServerLocator } from "./RavenServerLocator";
import { throwError } from "../Exceptions";

interface ProcessStartInfo {
    command: string;
    arguments: string[];
}

export abstract class RavenServerRunner {

    public static run(locator: RavenServerLocator): ChildProcess {
        const processStartInfo = this._getProcessStartInfo(locator);
        return spawn(processStartInfo.command, processStartInfo.arguments);
    }

    private static _getProcessStartInfo(locator: RavenServerLocator): ProcessStartInfo {
        const serverPath = locator.getServerPath();
        if (!fs.existsSync(serverPath)) {
            throwError("FileNotFoundException", `Server file was not found: ${locator.getServerPath()}`);
        }

        const commandArguments = [
                locator.withHttps() ? "--ServerUrl=https://127.0.0.1:8085" : "--ServerUrl=http://127.0.0.1:0",
                "--RunInMemory=true",
                "--License.Eula.Accepted=true",
                "--Setup.Mode=None",
                `--Testing.ParentProcessId=${ process.pid }`,
                ...locator.getCommandArguments() 
        ];

        return {
            command: locator.getCommand(),
            arguments: commandArguments
        };
    }
}