import { Transformation, serializeTransformation } from "./Transformation";
import { ConnectionString } from "./ConnectionString";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class EtlConfiguration<T extends ConnectionString> {
    public taskId: number;
    public name: string;
    public mentorNode: string;
    public connectionStringName: string;
    public transforms: Transformation[];
    public disabled: boolean;
    public allowEtlOnNonEncryptedChannel: boolean;

    public serialize(conventions: DocumentConventions): object {
        return {
            TaskId: this.taskId,
            Name: this.name,
            MentorName: this.mentorNode,
            ConnectionStringName: this.connectionStringName,
            Transforms: this.transforms.map(x => serializeTransformation(x)),
            Disabled: this.disabled,
            AllowEtlOnNonEncryptedChannel: this.allowEtlOnNonEncryptedChannel
        }
    }
}