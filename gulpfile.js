const _ = require('lodash');
const fs = require('fs');
const gulp = require('gulp');
const rmdir = require('rimraf');
const sort = require('gulp-sort');
const mocha = require('gulp-mocha');
const ts = require('gulp-typescript');
const append = require('gulp-append');
const transform = require('gulp-transform');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-harmony');
const args = require('./args');

const preamble = '/** RavenDB Client - (c) Hibernating Rhinos 2017 */';
const exportDefault = 'export default DocumentStore;';

const prioritizedClasses = [
    'Observable.ts', 'RequestExecutor.ts', 'RavenCommand.ts',
    'DatabaseExceptions.ts',  'AbstractHiloKeyGenerator.ts', 'IndexQueryBasedCommand.ts', 
    'GetIndexesCommand.ts', 'GetTopologyCommand.ts'
];

const options = {
    src: './src',
    tests: './test',
    tmp: './.build',
    dest: './lib',
};

gulp.task('clean', (next) => rmdir(options.tmp, next));

gulp.task('build:tests:args', ['clean'], () => gulp
    .src('./args.js', {
        base: __dirname
    })
    .pipe(gulp.dest(options.tmp))
);

gulp.task('build:tests', ['clean', 'build:tests:args'], () => gulp
    .src([
        options.tests + '/Test*.ts',
        options.tests + '/**/*Test.ts',
        options.src + '/[A-Z]*/**/*.ts'
    ], {
        base: __dirname
    })
    .pipe(ts({
        allowJs: true,
        target: 'ES6',
        module: 'commonjs',
        removeComments: true,
        lib: ["dom", "es7"]
    }))
    .pipe(gulp.dest(options.tmp))
);

gulp.task('run:tests', ['clean', 'build:tests'], (next) => {
    let tests = args.test.map(
        (test) => `${options.tmp}/test/**/${test}Test.js`
    );

    if (args.test.includes('*') || (true !== args['no-fixtures'])) {
        tests.unshift(options.tmp + '/test/TestBase.js');
    }

    return gulp.src(tests)
        .pipe(mocha({
            "ravendb-host": args["ravendb-host"], 
            "ravendb-port": args["ravendb-port"]
        }))
        .on('error', () => process.exit(-1));
});

gulp.task('build:exports', ['clean'], () => gulp
    .src(options.src + '/ravendb-node.ts')
    .pipe(transform(contents => preamble + "\n"
        + contents
            .toString()
            .split('\n')
            .map(line => (line.startsWith('export') 
                || line.startsWith('} from'))
                ? line.replace(/ from.*;/, ';')
                : line
            )            
            .join('\n')
    ))
    .pipe(gulp.dest(options.tmp))
);

gulp.task('build:concat', ['clean'], () => {
    const allExceptions = fs
        .readFileSync(`${options.src}/Database/DatabaseExceptions.ts`)
        .toString().match(/class\s+([\w\d]+)\s*/g)
        .map((match) => match.replace(/class\s+/, ''));  

    return gulp
        .src(options.src + '/[A-Z]*/**/*.ts')
        .pipe(sort({
            comparator: (file, anotherFile) => {
                const isPrioritized = (file) => prioritizedClasses
                    .some((className) => !!~file.path.indexOf(className));

                return isPrioritized(file) ? -1 : (
                    isPrioritized(anotherFile) ? 1 : 0
                );
            }
        }))
        .pipe(concat('ravendb-node.bundle.ts'))
        .pipe(transform(contents => contents
            .toString()
            .split('\n')
            .filter(line => !line.startsWith('import'))
            .map(line => line.replace(/export /, ''))
            .map(line => line.replace(
                '<IRavenObject<typeof RavenException>><any>exceptions',
                `{ ${allExceptions.join(', ')} }`
            ))
            .join('\n')
            + "\n\n" + exportDefault + "\n"
        ))
        .pipe(gulp.dest(options.tmp));
});

gulp.task('build:bundle', ['clean', 'build:exports', 'build:concat'], () => gulp
    .src([
        options.tmp + '/ravendb-node.ts',
        options.tmp + '/ravendb-node.bundle.ts'
    ])
    .pipe(concat('ravendb-node.ts'))
    .pipe(gulp.dest(options.tmp))
);

gulp.task('build:compile', ['clean', 'build:exports', 'build:concat', 'build:bundle'], () => gulp
    .src(options.tmp + '/ravendb-node.ts')
    .pipe(ts({
        target: 'ES6',
        module: 'commonjs',
        removeComments: true,
        declaration: true,
        lib: ["dom", "es7"]
    }))
    .pipe(gulp.dest(options.dest))
);

gulp.task('build:uglify', ['clean', 'build:exports', 'build:concat', 'build:bundle', 'build:compile'], () => gulp
    .src(options.dest + '/ravendb-node.js')
    .pipe(uglify({
        mangle: {
            toplevel: true
        },
        output: {
            preamble: preamble
        }
    }))
    .pipe(gulp.dest(options.dest))
);

gulp.task('test', ['clean', 'build:tests', 'run:tests']);

gulp.task('bundle', ['clean', 'build:exports', 'build:concat', 'build:bundle', 'build:compile', 'build:uglify']);