import { DocumentConventions } from "../..";
import { RavenCommand } from "../../Http/RavenCommand";

export interface IServerOperation<T> {
    getCommand(conventions: DocumentConventions): RavenCommand<T>;
}
