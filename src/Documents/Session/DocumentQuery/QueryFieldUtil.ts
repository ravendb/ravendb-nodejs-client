
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
    
    // Convert the selector function to string to extract the property name
    const funcStr = fieldSelector.toString();
    
    // Try to match property access patterns like: x => x.property or (x) => x.property
    const arrowMatch = /=>.*?\.([^.\s()[\]]+)/.exec(funcStr);
    if (arrowMatch && arrowMatch[1]) {
        return arrowMatch[1];
    }
    
    // For more complex selectors, we need more sophisticated parsing
    // This is a simplified implementation - in production code you might need
    // more robust handling of complex property paths
    throwError("InvalidOperationException", 
        "Could not extract field name from selector. Use a simple property selector like 'x => x.propertyName'");
}
