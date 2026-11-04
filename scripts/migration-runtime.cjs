const {Miniflare,convertV4MiniflareOptions}=require(require.resolve('miniflare',{paths:[require.resolve('wrangler')]}));
const fs=require('node:fs'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');let outbound=0;
(async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'test',modules:true,scriptPath:root+'/.cf-build/index.js',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],bindings:{},assets:{directory:root+'/public',routerConfig:{has_user_worker:true}},outboundService:()=>{outbound++;throw Error('Unknown outbound denied')}}]}));
 try{
  for(const path of ['/','/openapi.yaml','/health']){
   const response=await mf.dispatchFetch('https://offline.invalid'+path),body=await response.text();assert.equal(response.status,200);
   if(path==='/health')assert.deepEqual(JSON.parse(body),{ok:true,liveData:false});
   else assert.equal(body,fs.readFileSync(root+'/public/'+(path==='/'?'index.html':'openapi.yaml'),'utf8'));
   console.log(path,response.status,response.headers.get('content-type'),body.length);
  }
  assert.equal(outbound,0);console.log('Compiled Worker root/OpenAPI/safe health pass; outbound=0');
 }finally{await mf.dispose()}
})().catch(e=>{console.error(e);process.exitCode=1});
