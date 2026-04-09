import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Register ts-node for import() (ESM loader hook)
register('ts-node/esm', pathToFileURL('./'));

// Register ts-node for require() (CJS hook) - needed for mocha 11+ on Node 22+
// which uses require(esm) to load test files
const require_ = createRequire(import.meta.url);
require_('ts-node').register();