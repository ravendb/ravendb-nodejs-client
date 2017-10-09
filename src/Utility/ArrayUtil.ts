export class ArrayUtil {
  public static mapObject(input: object, mapper: (item: any, key?: string) => any): object {
    let result: object = {};
    let property: string;

    for (property in input) {
      result[property] = mapper(input[property], property);
    }

    return result;
  }

}