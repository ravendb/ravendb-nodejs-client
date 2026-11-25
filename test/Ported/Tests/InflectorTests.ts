import { plural } from "../../../src/ext/pluralize/pluralize.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("InflectorTests", function () {

    for (const [word, expected] of [["User", "Users"], ["Users", "Users"], ["tanimport", "tanimports"], ["tanimports", "tanimports"]]) {
        it(`can use pluralize safely on maybe already pluralized words (${word})`, () => {
            assertThat(plural(word)).isEqualTo(expected);
        });
    }
});
