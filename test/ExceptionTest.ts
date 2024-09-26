import { inspect } from "node:util";
import { assertThat } from "./Utils/AssertExtensions.js";
import { getError } from "../src/Exceptions/index.js";

const inRush = new Error("I was in rush");
const glasses = new Error("I forgot to put my classes", { cause: inRush });
const accident = new Error("I caused accident", { cause: glasses });


describe("Exception Test", () => {

    it("can see nested causes", () => {
        const exceptionSerialized = inspect(accident);

        assertThat(exceptionSerialized)
            .contains(inRush.message);

        assertThat(exceptionSerialized)
            .contains(glasses.message);

        assertThat(exceptionSerialized)
            .contains(accident);
    });

    it("can get error - no cause", () => {
        const error = getError("ConflictException", "This is fake conflict");
        const exceptionSerialized = inspect(error);
        assertThat(exceptionSerialized)
            .contains(error.message);
    });

    it("can get error - with cause", () => {
        const error = getError("ConflictException", "This is fake conflict", accident);

        const exceptionSerialized = inspect(error);

        assertThat(exceptionSerialized)
            .contains(error.message);

        assertThat(exceptionSerialized)
            .contains(inRush.message);

        assertThat(exceptionSerialized)
            .contains(glasses.message);

        assertThat(exceptionSerialized)
            .contains(accident);
    });
})