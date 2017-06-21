class Foo {
  constructor(
    public id?: string,
    public name: string = "",
    public order: number = 0   
  ) {}        
}

const foo: Foo = new Foo('1', '2', 3);
const bar: object = {id: '1', name: '2', order: 3};

console.log(typeof foo);
console.log(typeof bar);
console.log(foo.constructor.name);
console.log(bar.constructor.name);