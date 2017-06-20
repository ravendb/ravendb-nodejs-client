"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
class TypeUtil {
    static isNone(value) {
        return ('undefined' === (typeof value)) || _.isNull(value);
    }
    static isString(value) {
        return _.isString(value);
    }
    static isNumber(value) {
        return _.isNumber(value);
    }
    static isArray(value) {
        return _.isArray(value);
    }
    static isObject(value) {
        return _.isObject(value) && !this.isArray(value);
    }
    static isFunction(value) {
        return _.isFunction(value);
    }
    static isDate(value) {
        return _.isDate(value);
    }
    static isBool(value) {
        return _.isBoolean(value);
    }
}
exports.TypeUtil = TypeUtil;
