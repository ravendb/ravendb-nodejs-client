const {
    DocumentStore,
    DeleteDatabasesOperation,
    CreateDatabaseOperation,
    RequestExecutor
} = require("../dist");
const {
    bench,
    settings
} = require("./common");

const nodbStore = new DocumentStore(settings.urls);
nodbStore.initialize();

// RequestExecutor.requestPostProcessor = (req) => {
//     req.proxy = "http://127.0.0.1:8888";
// };

const store = new DocumentStore(settings.urls, settings.database);
store.initialize();

class Order {
    constructor(opts) {
        if (opts) {
            Object.assign(this, opts);
        }
    }
}

let data;

(async function main() {

    const getBenchOpts = (n) => ({
        async before() {
            const dataGen = getData();
            data = Object.keys(Array.apply(0,Array(n))).map(x => new Order(dataGen.next().value));
            try {
                await nodbStore.maintenance.server.send(new DeleteDatabasesOperation({
                    databaseNames: [settings.database],
                    hardDelete: true
                }));
            } finally {
                await nodbStore.maintenance.server.send(new CreateDatabaseOperation({
                    databaseName: settings.database
                }));
            }
        },
        async after() {
            await nodbStore.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [settings.database],
                hardDelete: true
            }));
        }
    });

    try {
        const name = "bulk-insert-2018-10-18-pipeline";
        await bench(name, 10, bulkInsertPipeline, getBenchOpts(1000));
        await bench(name, 50, bulkInsertPipeline, getBenchOpts(1000));
        await bench(name, 100, bulkInsertPipeline, getBenchOpts(1000));
    } finally {
        store.dispose();
        nodbStore.dispose();
    }

}());

function randomDate() {
    return new Date(2018, Math.floor(Math.random() * 11), Math.floor(Math.random() * 25));
}

function randomInt(max = 100) { 
    return Math.floor(Math.random() * max);
}

function* getData() {
    let i = 1;
    while (true) {
        i++;
        yield new Order({
            "Id": "orders/" + i,
            "Name": "Order #" + i,
            "Company": "companies/58-A",
            "Employee": "employees/2-A",
            "Freight": randomInt(),
            "Lines": [{
                    "Discount": 0,
                    "PricePerUnit": randomInt(),
                    "Product": "products/11-A",
                    "ProductName": "Queso Cabrales",
                    "Quantity": 10
                },
                {
                    "Discount": 0,
                    "PricePerUnit": 4.5,
                    "Product": "products/24-A",
                    "ProductName": "Guaraná Fantástica",
                    "Quantity": randomInt()
                }
            ],
            "OrderedAt": randomDate(),
            "RequireAt": randomDate(),
            "ShipTo": {
                "City": "México D.F.",
                "Country": "Mexico",
                "Line1": "Calle Dr. Jorge Cash 321",
                "Line2": null,
                "Location": {
                    "Latitude": Math.random() * 100,
                    "Longitude": Math.random() * 100
                },
                "PostalCode": "05033",
                "Region": null
            },
            "ShipVia": "shippers/2-A",
            "ShippedAt": null
        });
    }
}

async function bulkInsertPipeline() {
    const bulk = store.bulkInsert();
    for (const item of data) {
        await bulk.store(item);
    }

    await bulk.finish();
}