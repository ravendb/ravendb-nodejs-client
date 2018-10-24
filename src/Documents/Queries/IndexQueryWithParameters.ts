import { IndexQueryBase } from "./IndexQueryBase";

export abstract class IndexQueryWithParameters<T> extends IndexQueryBase<T> {

    /**
     * Allow to skip duplicate checking during queries
     */
    public skipDuplicateChecking: boolean;

}
