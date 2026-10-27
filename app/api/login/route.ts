import {cors,preflight,PAGES_ORIGIN} from '../../../lib/cors';
import {env} from 'cloudflare:workers';
import {COOKIE,USERNAME,digest,noStore,sameOrigin,verifyPassword} from '../../../lib/auth';
export const dynamic='force-dynamic';
async function handlePOST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Origem inválida.'},{status:403,headers:noStore});
 try{
 if(Number(req.headers.get('content-length')||0)>4096)return Response.json({error:'Solicitação inválida.'},{status:400,headers:noStore});
 const body=await req.json() as {username?:unknown,password?:unknown};if(typeof body.username!=='string'||typeof body.password!=='string'||body.password.length>256)return Response.json({error:'Usuário ou senha incorretos.'},{status:401,headers:noStore});
 const now=Date.now();const key=await digest('login:'+ (req.headers.get('cf-connecting-ip')||'unknown'));
 const limit=await env.DB!.prepare('INSERT INTO login_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING attempts,reset_at').bind(key,now+900000,now,now,now+900000).first<{attempts:number,reset_at:number}>();
 if(!limit||limit.attempts>5)return Response.json({error:'Muitas tentativas. Aguarde 15 minutos e tente novamente.'},{status:429,headers:{...noStore,'Retry-After':'900'}});
 const valid=await verifyPassword(body.password);if(body.username.trim()!==USERNAME||!valid)return Response.json({error:'Usuário ou senha incorretos.'},{status:401,headers:noStore});
 const bytes=crypto.getRandomValues(new Uint8Array(32));const session=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 await env.DB!.batch([env.DB!.prepare('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)').bind(await digest(session),now+28800000),env.DB!.prepare('DELETE FROM login_limits WHERE key=? OR reset_at<?').bind(key,now),env.DB!.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now)]);
 return Response.json({ok:true,...(req.headers.get('origin')===PAGES_ORIGIN?{token:session}:{})},{headers:{...noStore,'Set-Cookie':`${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
 }catch{return Response.json({error:'Não foi possível entrar. Tente novamente mais tarde.'},{status:503,headers:noStore});}
}

export const OPTIONS=preflight;
export async function POST(req:Request){return cors(req,await handlePOST(req));}
