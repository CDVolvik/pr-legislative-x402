import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['test/**/*.test.ts'],setupFiles:['./migration.setup.ts'],fileParallelism:false}});
