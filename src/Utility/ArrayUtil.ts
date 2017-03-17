export class ArrayUtil {
  public static mapObject(input: Object, mapper: (item: any, key?: string) => any): Object {
    let result: Object = {};
    let property: string;

    for (property in input) {
      result[property] = mapper(input[property], property);
    }

    return result;
  }
}