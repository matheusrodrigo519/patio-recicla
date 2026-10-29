import {env} from 'cloudflare:workers';
import {authenticated,denied,sameOrigin} from '../../../lib/auth';
import {cors,preflight} from '../../../lib/cors';
export const dynamic='force-dynamic';
export const OPTIONS=preflight;
async function handle(req:Request){
 if(!await authenticated(req))return denied();
 try{
 const bucket=env.BUCKET;if(!bucket)throw Error('Armazenamento indisponível.');
 const url=new URL(req.url),move=url.searchParams.get('move')||'';
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(move))throw Error('Lançamento inválido.');
 const row=await env.DB!.prepare('SELECT payload FROM records WHERE id=?').bind('business').first<{payload:string}>();
 if(!row||!JSON.parse(row.payload).moves.some((m:any)=>m.id===move))return Response.json({error:'Lançamento não encontrado.'},{status:404});
 const prefix='receipts/'+move+'/';
 if(req.method==='POST'){
 if(!sameOrigin(req))return Response.json({error:'Origem inválida.'},{status:403});
 if(Number(req.headers.get('content-length'))>6*1024*1024)throw Error('Arquivo muito grande. Limite: 5 MB.');
 const form=await req.formData(),file=form.get('file');
 if(!(file instanceof File)||!file.size||file.size>5*1024*1024)throw Error('Envie um arquivo de até 5 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 if(!pdf&&!jpeg&&!png)throw Error('Formato inválido. Use foto JPG/PNG ou PDF.');
 const type=pdf?'application/pdf':jpeg?'image/jpeg':'image/png',ext=pdf?'pdf':jpeg?'jpg':'png';
 const key=prefix+crypto.randomUUID()+'.'+ext;
 await bucket.put(key,bytes,{httpMetadata:{contentType:type},customMetadata:{name:file.name.slice(0,150),uploaded:new Date().toISOString()}});
 return Response.json({ok:true});
 }
 const key=url.searchParams.get('key');
 if(key){if(!key.startsWith(prefix)||key.slice(prefix.length).includes('/'))throw Error('Arquivo inválido.');const file=await bucket.get(key);if(!file)return new Response(null,{status:404});return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':'attachment; filename="comprovante.'+key.split('.').pop()+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 const listed=await bucket.list({prefix,limit:100,cursor:url.searchParams.get('cursor')||undefined,include:['customMetadata']} as R2ListOptions);
 return Response.json({files:listed.objects.map(o=>({key:o.key,name:o.customMetadata?.name||'Comprovante',size:o.size,date:o.uploaded.toISOString()})),cursor:listed.truncated?listed.cursor:null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Não foi possível acessar os comprovantes.'},{status:400});}
}
export async function GET(req:Request){return cors(req,await handle(req));}
export async function POST(req:Request){return cors(req,await handle(req));}
