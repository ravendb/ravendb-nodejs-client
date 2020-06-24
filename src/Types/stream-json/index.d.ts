declare module "stream-json/filters/FilterBase" {
    class FilterBase {
        constructor();

        public _stack: any;
        public push: (value: any) => void;
    }

    namespace FilterBase {

    }

    export = FilterBase;
}
