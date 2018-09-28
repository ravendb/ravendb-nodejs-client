import { CommandType } from "./Commands/CommandData";

export class IdTypeAndName {
    private id: string;
    private type: CommandType;
    private name: string;

    public equals(o: object): boolean {
        if (this === o) {
            return true;
        }
        
        if (!o || this.constructor !== o.constructor) { 
            return false; 
        }

        const that = o as IdTypeAndName;

        if (this.id ? this.id === that.id : !!that.id) {
             return false;
        }

        if (this.type !== that.type) { 
            return false; 
        }

        return this.name ? this.name === that.name : !!that.name;
    }

    public static create(id: string, type: CommandType, name: string): IdTypeAndName {
        const idTypeAndName = new IdTypeAndName();
        return Object.assign(idTypeAndName, { id, type, name });
    }

    public key() {
        return IdTypeAndName.keyFor(this.id, this.type, this.name);
    }

    public static keyFor(id: string, type: CommandType, name: string) {
        return `${id}.${type}.${name}`;
    }
}
