const fs = require('fs');
const rmdir = require('rimraf').sync;
const glob = require('glob').sync;
const exec = require('child_process').execSync;

const bundle = '.build/ravendb-node.ts';
const source = 'src/ravendb-node.ts';
const target = 'lib/ravendb-node.js';
const files = glob('src/[A-Z]*/**/*.ts');
const preamble = '/** RavenDB Client - (c) Hibernating Rhinos 2017 */';

rmdir('lib');
rmdir('.build');

fs.mkdirSync('.build');
fs.writeFileSync(bundle, `${preamble}\n`);

const exportsConfig = fs.readFileSync(source, 'utf8')
        .split('\n')
        .filter(line => !line.startsWith('import'))
        .map(line => line.replace(/ from.*;/, ';'))
        .join('\n');

fs.writeFileSync(bundle, exportsConfig, { encoding: 'utf8', flag: 'a' });

const allContents =
    files.map(file => {
        const contents = fs.readFileSync(file, 'utf8');
        const lines = contents.split('\n');

        const filtered = lines
            .filter(line => !line.startsWith('import'))
            .map(line => line.replace(/export /, ''))
            .join('\n');

        return `/* file: ${file} */\n${filtered}`;
    }).join('\n');

fs.writeFileSync(bundle, allContents, { encoding: 'utf8', flag: 'a' });

[
    `tsc -m commonjs -t es6 -d --removeComments --outDir lib ${bundle}`,
    `uglifyjs -m sort,toplevel -c --preamble "${preamble}" -o ${target} ${target}`
]
    .map(cmd => `${__dirname}/../node_modules/.bin/${cmd}`)
    .map(cmd => exec(cmd));