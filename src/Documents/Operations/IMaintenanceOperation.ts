import { DocumentConventions } from "../Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";

export interface IMaintenanceOperation<TResult> {
     getCommand(conventions: DocumentConventions): RavenCommand<TResult>;
}