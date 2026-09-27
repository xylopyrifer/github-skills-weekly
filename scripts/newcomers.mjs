import {fileURLToPath} from 'node:url';
import {githubClient} from './lib/github.mjs';
import {updateNewcomers} from './lib/newcomers.mjs';
await updateNewcomers({root:fileURLToPath(new URL('../',import.meta.url)),get:githubClient({maxRequests:260})});
