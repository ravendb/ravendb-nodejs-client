import { HiloIdGenerator } from "./HiloIdGenerator";
import { NextId } from "./NextId";


export class DefaultHiLoIdGenerator extends HiloIdGenerator {

    protected getDocumentIdFromId(result: NextId): string {
        return this._prefix + result.id + "-" + result.serverTag;
    }

    async generateDocumentId(entity: object): Promise<string> {
        const result = await this.getNextId();
        return this.getDocumentIdFromId(result);
    }
}

