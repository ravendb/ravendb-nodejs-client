const fs = require("fs");

fs.unlinkSync("./src/index.ts");
fs.closeSync(fs.openSync("./src/index.ts", 'w'));

