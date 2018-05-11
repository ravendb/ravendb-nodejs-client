import { IndexQueryBase } from "./IndexQueryBase";

export abstract class IndexQueryWithParameters<T> extends IndexQueryBase<T> {

    /**
     * Allow to skip duplicate checking during queries
     * @return true if server can skip duplicate checking
     */
    public skipDuplicateChecking: boolean;

    //TBD private boolean explainScores;

    //TBD private boolean showTimings;

    //TBD public boolean isExplainScores() {

    //TBD public void setExplainScores(boolean explainScores) {

    //TBD public boolean isShowTimings()
    //TBD public void setShowTimings(boolean showTimings) {
}