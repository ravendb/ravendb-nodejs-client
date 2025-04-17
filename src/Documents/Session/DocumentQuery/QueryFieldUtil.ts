
/**
 * Utility functions for working with query fields
 */

import { throwError } from "../../../Exceptions/index.js";

/**
 * Escapes a field name if necessary for use in queries
 * @param fieldName Field name to escape
 * @param isNestedPath Whether the field is a nested path
 */
export function escapeIfNecessary(fieldName: string, isNestedPath: boolean = false): string {
    if (!fieldName) {
        return fieldName;
    }
    
    // Handle already escaped field names
    if (fieldName.startsWith("'") && fieldName.endsWith("'")) {
        return fieldName;
    }
    
    if (isNestedPath || fieldName.includes(".") || fieldName.includes(" ")) {
        return "'" + fieldName + "'";
    }
    
    return fieldName;
}

/**
 * Extracts field name from a field selector function
 * @param fieldSelector Function that selects a field from an object
 * @returns Field name extracted from the selector
 */
export function getFieldNameFor(fieldSelector: (field: any) => any): string {
    if (!fieldSelector) {
        throwError("InvalidArgumentException", "Field selector cannot be null");
    }
    
    const funcStr = fieldSelector.toString();
    
    const arrowMatch = /=>.*?\.([^.\s()[\]]+)/.exec(funcStr);
    if (arrowMatch && arrowMatch[1]) {
        return arrowMatch[1];
    }
    
    throwError("InvalidOperationException",
        "Could not extract field name from selector. Use a simple property selector like 'x => x.propertyName'");
}
