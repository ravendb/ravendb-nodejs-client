const request = require("request");
const { DocumentStore } = require("../dist");

const store = new DocumentStore("http://localhost:8080", "Perf");
store.initialize();

(async function bench() {
    

    console.time("load");
//     await new Promise(resolve => {
//                 request({
//                         uri: "http://localhost:8080/studio/index.html"
//                     }).pipe(process.stdout)
//                     .on('end', () => resolve())
//                     .on('finish', () => resolve());
// });
    
    for (let i = 0; i < 100; i++) {
        {
            const session = store.openSession();
            await session.load([
                `orders/${i % 830 }-A`, 
                `orders/${(i + 1) % 830 }-A`, 
                `orders/${(i + 2) % 830 }`]);
        }
    }
    console.timeEnd("load");

    // console.profile("load");
    // const session = store.openSession();
    // await session.load(`orders/1-A`);
    store.dispose();
})();
