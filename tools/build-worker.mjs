import {build} from '../app/node_modules/.pnpm/node_modules/esbuild/lib/main.js';
import path from 'node:path';
await build({entryPoints:[new URL('../server/worker.ts',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],outfile:process.argv[2]?path.resolve(process.argv[2],'_worker.js'):new URL('../app/dist/_worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),bundle:true,format:'esm',platform:'browser',target:'es2022'});
