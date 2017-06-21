type MyClassConstructor<T> = {new(...args: any[]): T; };

class MyClass
{
  protected message: string = "Hello, World\n";

  constructor(message?: string)
  {
    if ("string" === (typeof message)) {
      this.message = message;
    }
  }

  print(): void
  {
    console.log(this.message);
  }
}

class Factory
{
  public static create<T extends Object>(classNameOrDocumentType: string | MyClassConstructor<T>, message?: string): T
  {
    if ('function' === (typeof classNameOrDocumentType)) {
      return new (classNameOrDocumentType as MyClassConstructor<T>)(message);
    }    

    let result: T = {} as T;

    Object.assign(result, {message: message});

    return result;
  }
}

console.log(Factory.create<MyClass>(MyClass, '123'));
console.log(Factory.create<MyClass>('MyClass', '123'));