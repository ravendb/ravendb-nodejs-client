
export type ReplacerFunction = (key: string, value: any) => any;
export type ContextMatcherFunction = (context: ReplacerContext) => boolean;
export type FieldReplacerCallback = (context: ReplacerContext) => boolean;

export class ReplacerContext {
    public path: string = "";
    public key: string = null;
    public value: any = null;
    public parent: object = null;

    private _parentsStack: object[] = [];
    private _pathSegments: string[] = []; 

    public update(parent: object, key: string, value: any) {
        if (!key) {
            return;
        }

        this.key = key;
        this.value = value;
        this.parent = parent;

        const parentIdx = this._parentsStack.indexOf(parent);
        if (this._parentsStack.length 
            && parentIdx === this._parentsStack.length - 1) {
            this._pathSegments[this._pathSegments.length - 1] = key;    
        } else if (parentIdx === -1) {
            this._parentsStack.push(parent);
            this._pathSegments.push(key);
        } else {
            const deleteCount = this._parentsStack.length - parentIdx;
            this._parentsStack.splice(parentIdx, deleteCount, parent);
            this._pathSegments.splice(parentIdx, deleteCount, key);
        }
    }

    public get currentPath() {
        return this._pathSegments.join(".");
    }
}

export interface ReplacerTransformRule {
    contextMatcher: ContextMatcherFunction;
    replacer: ReplacerFunction;
}

export class SkippingReplacerFactory {
    public static build(toSkip: any[], replacer: ReplacerFunction) {
        const toSkipSet = new Set(toSkip);
        return RuleBasedReplacerFactory.build([
            {
                contextMatcher: (context) => !toSkipSet.has(context.value),
                replacer
            }
        ]);
    }
}

export class RuleBasedReplacerFactory {

        public static build(
            rules: ReplacerTransformRule[], 
            fieldCallback?: (context: ReplacerContext) => void) {

            const context = new ReplacerContext();

            return function (key: string, value: any) {
                context.update(this, key, value);

                if (fieldCallback) { 
                    fieldCallback(context);
                }

                for (const entry of rules) {
                    if (entry.contextMatcher(context)) {
                        return entry.replacer.call(this, key, value);
                    }
                }

                return value;
            };
        }
}