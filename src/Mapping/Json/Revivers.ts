export function camelCaseReviver(key, value) {
    if (key && !Array.isArray(this)) {
        const newKey = key.charAt(0).toLowerCase() + key.slice(1);
        if (key !== newKey) {
            this[newKey] = value;
        } else {
            return value;
        }
    } else {
        return value;
    }
}

export function pascalCaseReviver(key, value) {
    if (key && !Array.isArray(this)) {
        const newKey = key.charAt(0).toUpperCase() + key.slice(1);
        if (key !== newKey) {
            this[newKey] = value;
            return;
        } else {
            return value;
        }
    } 
    
    return value;
}