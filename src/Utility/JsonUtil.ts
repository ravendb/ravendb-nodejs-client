
export function camelCaseReviver(key, val) {
    if (key) {
        this[key.charAt(0).toLowerCase() + key.slice(1)] = val;
    } else {
        return val;
    }
}
