# LOAD PIPELINE

## Current 4.0.3

- x10: 11226.364ms
- x50: 56864.695ms
- x100: 108768.546ms

```javascript
async function loadPipeline() {
    const dataStream = fs.createReadStream("./load_data.json");
    let body;
    const results = await GetDocumentsCommand
        .parseDocumentsResultResponseAsync(dataStream, store.conventions, _ => body = _);
}
```

## Raw stream-json

- x10: 1348.737ms
- x50: 5675.162ms
- x100: 11056.510ms

```javascript
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

## camel-everything-stream-json-including-stuff-in-metadata

- x10: 2526.681ms
- x50: 11551.361ms
- x100: 22518.508ms

```javascript
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

## stream-json-with-proper-casing

- x10: 2531.119ms
- x50: 10749.968ms
- x100: 22324.239ms

```javascript
function buildEntityKeysTransform(entityCasingConvention) {
    return function entityKeysTransform(key, stack) {
        const len = stack.length;
        if (len === 1) {
            // Results, Includes
            return "camel";
        }

        // len === 2 is array index

        if (len === 3) {
            // top document level
            return key === "@metadata" ? null : entityCasingConvention;
        }

        if (len === 4) {
            return stack[len - 2] === "@metadata"
                && (key[0] === "@" || key === "Raven-Node-Type")
                ? null : entityCasingConvention;
        }

        if (len === 5) {
            if (stack[len - 2] === "@metadata") {
                 return stack[len - 1] === "@attachments" ?
                     "camel" : null;
            }
        }

        return entityCasingConvention; 
    }
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
```

## 4.0.4-load-full-pipeline 

- x10: 1784.831ms
- x50: 7229.829ms
- x100: 14543.986ms

```javascript
async function loadPipeline() {
    const dataStream = fs.createReadStream("./load_data.json");
    let body;
    const results = await GetDocumentsCommand
        .parseDocumentsResultResponseAsync(dataStream, store.conventions, _ => body = _);
}
```
