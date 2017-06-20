const args = require('command-line-args');

const argsDefs = [
  { name: 'no-fixtures', alias: 'f', type: Boolean, defaultValue: false },
  { name: 'test', alias: 't', type: String, multiple: true, defaultValue: ['*'] },
  { name: 'ravendb-host', alias: 'h', type: String, defaultValue: 'localhost.fiddler' },
  { name: 'ravendb-port', alias: 'p', type: String, defaultValue: '8080' }
];

module.exports = args(argsDefs, { partial: true });