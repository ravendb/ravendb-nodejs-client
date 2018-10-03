# LOAD PIPELINE

## Current 4.0.3

```
async function loadPipeline() {
    const dataStream = fs.createReadStream("./load_data.json");
    let body;
    const results = await GetDocumentsCommand
        .parseDocumentsResultResponseAsync(dataStream, store.conventions, _ => body = _);
}
```

- x10: 11226.364ms
- x50: 56864.695ms
- x100: 108768.546ms


## Raw stream-json

```
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
        parserStream
    ]);
    await donePromise;
}
```

- x10: 1348.737ms
- x50: 5675.162ms
- x100: 11056.510ms

## camel-everything-stream-json-including-stuff-in-metadata

```
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
            rules: [
                { transform: "camel" }
            ]
        })
    ];
    const asm = Asm.connectTo(streams[streams.length - 1]);
    const donePromise = new Promise(resolve => {
        asm.on('done', asm => {
            resolve(asm.current);
        });
    });
    await StreamUtil.pipelineAsync(streams);
    await donePromise;
}
```

- x10: 2526.681ms
- x50: 11551.361ms
- x100: 22518.508ms