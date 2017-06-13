type MyClassConstructor<T> = {new(message?: string): T; };

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
  public static create<T>(className: MyClassConstructor<T>, message?: string): T
  {
    return new className(message);
  }
}

Factory.create(MyClass).print();