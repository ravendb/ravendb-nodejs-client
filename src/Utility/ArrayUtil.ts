export class ArrayUtil {

    public static range<T>(n: number, func: (idx: number) => T) {
        return new Array<T>(n)
            .fill(null).map((x, i) => func(i));
    }

}
