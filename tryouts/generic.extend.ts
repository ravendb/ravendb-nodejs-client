abstract class Basic<T> {
  protected abstract maker(): new() => T;

  public make(): T {
    const maker: new() => T = this.maker();
    
    return new maker();
  }
}

class Target {
  public title = 'Target';
}

class Advanced extends Basic<Target> {
  protected maker(): new() => Target {
    return Target;
  }
}

const advanced = new Advanced();
const target: Target = advanced.make();

console.log(target.title);
