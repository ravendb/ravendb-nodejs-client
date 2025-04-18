export function toPropertyPath<T>(selector: (obj: T) => void): string {
    const fnStr = selector.toString();
    const match = fnStr.match(/\(?.*\)?\s*=>\s*.*?\.(.*?)(?:\W|$)/);
    return match ? match[1] : fnStr;
}
