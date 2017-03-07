const fs = require('fs');
const rmdir = require('rimraf').sync;
const glob = require('glob').sync;
const exec = require('child_process').execSync;

const files = glob('test/**/*Test.ts');

rmdir('.build');
fs.mkdirSync('.build');

files
    .map(file => `tsc -m commonjs -t es6 -d --removeComments --outDir .build ${file}`)
    .map(cmd => `${__dirname}/../node_modules/.bin/${cmd}`)
    .map(cmd => exec(cmd));