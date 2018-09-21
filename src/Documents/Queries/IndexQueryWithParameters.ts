import { IndexQueryBase } from "./IndexQueryBase";

export abstract class IndexQueryWithParameters<T> extends IndexQueryBase<T> {

    /**
     * Allow to skip duplicate checking during queries
     * @return true if server can skip duplicate checking
     */
    public skipDuplicateChecking: boolean;

    //TBD 4.1 private boolean explainScores;

    //TBD 4.1 private boolean showTimings;

    //TBD 4.1 public boolean isExplainScores() {

    //TBD 4.1 public void setExplainScores(boolean explainScores) {

    //TBD 4.1 public boolean isShowTimings()
    //TBD 4.1 public void setShowTimings(boolean showTimings) {
}
