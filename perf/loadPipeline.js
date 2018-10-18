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
const { bench } = require("./common");

const store = new DocumentStore("http://localhost:8080", "Perf");
store.initialize();

(async function main() {
    {
        const name = "load-full-pipeline";
        await bench(name, 10, loadPipeline);
        await bench(name, 50, loadPipeline);
        await bench(name, 100, loadPipeline);
    }

    store.dispose();
}());

async function loadPipeline() {
    const dataStream = fs.createReadStream("./data/load_data.json");
    let body;
    const results = await GetDocumentsCommand
        .parseDocumentsResultResponseAsync(dataStream, store.conventions, _ => body = _);
}

async function rawStreamJson() {
    const dataStream = fs.createReadStream("./data/load_data.json");
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
    const dataStream = fs.createReadStream("./data/load_data.json");
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
}