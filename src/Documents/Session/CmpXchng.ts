import { MethodCall } from "./MethodCall";

export class CmpXchg extends MethodCall {
    
    public static value(key: string): CmpXchg  {
        const cmpXchg = new CmpXchg();
        cmpXchg.args = [ key ];

        return cmpXchg;
    }
}
