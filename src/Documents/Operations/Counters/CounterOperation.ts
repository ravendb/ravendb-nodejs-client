import { CounterOperationType } from "./CounterOperationType";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class CounterOperation {
    
    private _type: CounterOperationType;
    
    private _counterName: string;
    
    private _delta: number;
    
    protected _changeVector: string;
    
    public serialize(conventions: DocumentConventions): object {
        return {
            Type: this._type,
            CounterName: this._counterName,
            Delta: this._delta
        };
    }

    public get type(): CounterOperationType {
        return this._type;
    }
     public set type(value) {
        this._type = value;
    }

    public get counterName(): string {
        return this._counterName;
    }

    public set counterName(value) {
        this._counterName = value;
    }

    public get delta(): number {
        return this._delta;
    }

    public set delta(value) {
        this._delta = value;
    }

    public get changeVector(): string {
        return this._changeVector;
    }

    public set changeVector(changeVector: string) {
        this._changeVector = changeVector;
    }

    public static create(counterName: string, type: CounterOperationType): CounterOperation;
    public static create(counterName: string, type: CounterOperationType, delta: number): CounterOperation;
    public static create(counterName: string, type: CounterOperationType, delta?: number): CounterOperation {
        const operation = new CounterOperation();
        operation.counterName = counterName;
        operation.type = type;
        if (arguments.length === 3) {
            operation.delta = delta;
        }
        
        return operation;
    }
}
