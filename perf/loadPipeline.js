const { DocumentStore } = require("../dist");
const { GetDocumentsCommand } = require("../dist/Documents/Commands/GetDocumentsCommand");
const { TransformKeysJsonStream } = require("../dist/Mapping/Json/Streams/TransformKeysJsonStream");
const fs = require('fs');
const parser = require("stream-json")
const pick = require("stream-json/filters/Pick")
const { ignore } = require("stream-json/filters/Ignore")
const { replace } = require("stream-json/filters/Replace")
const streamArray = require("stream-json/streamers/StreamArray")
const streamObject = require("stream-json/streamers/StreamObject")
const streamValues = require("stream-json/streamers/StreamValues")
const StreamUtil = require("../dist/Utility/StreamUtil");
const stream = require("readable-stream");
const Asm = require('stream-json/Assembler');

const store = new DocumentStore("http://localhost:8080", "Perf");
store.initialize();

async function bench(name, attempts, run) {
    const benchName = `${name} x${ attempts }`;
    console.time(benchName);
    for (let n = 0; n < attempts; n++) {
        await run();
    }
    console.timeEnd(benchName);
}

(async function main() {
    {
        const name = "4.0.4-load-full-pipeline";
        await bench(name, 10, loadPipeline);
        await bench(name, 50, loadPipeline);
        await bench(name, 100, loadPipeline);
    }

    // {
    //     const name = "stream-json-with-proper-casing";
    //     // enhancedStreamJson();
    //     await bench(name, 10, enhancedStreamJson);
    //     await bench(name, 50, enhancedStreamJson);
    //     await bench(name, 100, enhancedStreamJson);
    // }

    store.dispose();
}());

async function loadPipeline() {
    const dataStream = fs.createReadStream("./load_data.json");
    let body;
    const results = await GetDocumentsCommand
        .parseDocumentsResultResponseAsync(dataStream, store.conventions, _ => body = _);
}

async function rawStreamJson() {
    const dataStream = fs.createReadStream("./load_data.json");
    const parserStream = parser();
    const asm = Asm.connectTo(parserStream);
    const donePromise = new Promise(resolve => {
        asm.on('done', asm => {
            resolve();
        });
    });
    await StreamUtil.pipelineAsync([
        dataStream,
        parserStream,
        ignore({ filter: "asasas" })
    ]);
    await donePromise;
}



async function enhancedStreamJson() {
    const dataStream = fs.createReadStream("./load_data.json");
    const streams = [
        dataStream,
        parser({
            packKeys: true,
            packStrings: true,
            packValues: true,
            packNumbers: true,
            streamNumbers: false,
            streamValues: false,
            streamKeys: false,
            streamStrings: false
        }),
        new TransformKeysJsonStream({
            getCurrentTransform: buildEntityKeysTransform("camel")
        })
    ];
    const asm = Asm.connectTo(streams[streams.length - 1]);
    const donePromise = new Promise(resolve => {
        asm.on('done', asm => {
            resolve(asm.current);
        });
    });
    await StreamUtil.pipelineAsync(streams);
    const result = await donePromise;
    // console.log(JSON.stringify(result, null, 2));
}