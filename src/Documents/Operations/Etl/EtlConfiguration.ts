import { Transformation, serializeTransformation } from "./Transformation.js";
import { ConnectionString } from "./ConnectionString.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";

export class EtlConfiguration<T extends ConnectionString> {
    public taskId?: number;
    public name?: string;
    public mentorNode?: string;
    public connectionStringName: string;
    public transforms: Transformation[];
    public disabled?: boolean;
    public allowEtlOnNonEncryptedChannel?: boolean;
    public pinToMentorNode?: boolean;

    public serialize(conventions: DocumentConventions): object {
        return {
            TaskId: this.taskId,
            Name: this.name,
            MentorNode: this.mentorNode,
            PinToMentorNode: this.pinToMentorNode,
            ConnectionStringName: this.connectionStringName,
            Transforms: this.transforms.map(x => serializeTransformation(x)),
            Disabled: this.disabled,
            AllowEtlOnNonEncryptedChannel: this.allowEtlOnNonEncryptedChannel
        }
    }
}
