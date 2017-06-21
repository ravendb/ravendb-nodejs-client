async function testPromise(i: number): Promise<void> {
  return Promise.resolve<void>(void 0)
    .then((): void | PromiseLike<void> => {
      if (i < 5) {
        return Promise.reject(new Error('i < 5'));
      }
    });
}; 

(async() => {
  const a: any = await testPromise(6);
  console.log(a);
  
  try {
    const b: any = await testPromise(1);
    console.log(b);
  } catch (e) {
    console.log('error', e.message);
  }  
})();
