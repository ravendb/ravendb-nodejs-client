import { IndexPriority, IndexState } from "./Enums";


export abstract class IndexDefinitionBase {
    public name: string;
    public priority: IndexPriority;
    public state: IndexState;

}
