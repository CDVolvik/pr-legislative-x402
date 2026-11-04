import {vi,afterAll,expect} from 'vitest';
delete process.env.DATABASE_URL;process.env.PAYMENTS_ENABLED='false';delete process.env.X402_BUYER_PRIVATE_KEY;delete process.env.BUYER_PRIVATE_KEY;
const deniedFetch=vi.fn(()=>{throw new Error('External fetch forbidden in offline acceptance');});
vi.stubGlobal('fetch',deniedFetch);
vi.mock('@neondatabase/serverless',()=>({neon:()=>{throw new Error('Database clients forbidden in offline acceptance');}}));
afterAll(()=>expect(deniedFetch).not.toHaveBeenCalled());
