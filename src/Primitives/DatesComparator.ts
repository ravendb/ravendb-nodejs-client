import { TypeUtil } from "../Utility/TypeUtil";
import { throwError } from "../Exceptions";

export type DateContext = "From" | "To";

export interface DateWithContext {
    date: Date;
    context: DateContext;
}

export class DatesComparator {
    public static compare(lhs: DateWithContext, rhs: DateWithContext): number {
        if (lhs.date && rhs.date) {
            return lhs.date.getTime() - rhs.date.getTime();
        }

        // lhr or rhs is null - unify values using context
        const leftValue = lhs.date
            ? lhs.date.getTime()
            : (lhs.context === "From" ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);

        const rightValue = rhs.date
            ? rhs.date.getTime()
            : (rhs.context === "From" ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);

        return leftValue - rightValue;
    }
}

/**
 * Date or MinDate if null
 */
export function leftDate(date: Date): DateWithContext {
    return {
        date,
        context: "From"
    }
}

/**
 * Date or MaxDate if null
 */
export function rightDate(date: Date): DateWithContext {
    return {
        date,
        context: "To"
    }
}

export function definedDate(date: Date): DateWithContext {
    if (!date) {
        throwError("InvalidArgumentException", "Date cannot be null");
    }

    return {
        date,
        context: "To"
    }
}
