import {cors,preflight,PAGES_ORIGIN} from '../../../lib/cors';
import {authenticated,denied,sameOrigin,verifyPassword,digest} from '../../../lib/auth';
import {env} from 'cloudflare:workers';
import {initial,apply,clearFinancials} from '../../../lib/engine';
export const dynamic='force-dynamic';
// All reads and writes require the business login, independently of hosting visibility.
async function handleGET(req:Request){if(!await authenticated(req))return denied();const row=await env.DB!.prepare('SELECT version,payload FROM records WHERE id=?').bind('business').first<any>();return Response.json({version:row?.version||0,state:row?JSON.parse(row.payload):initial()},{headers:{'Cache-Control':'no-store'}});}
async function handlePOST(req:Request){if(!await authenticated(req))return denied();if(!sameOrigin(req))return Response.json({error:"Origem inválida."},{status:403});try{const body=await req.json() as {version:number;command:Record<string,any>};delete body.command.loadId;if(body.command.action==='move'&&body.command.type==='Ajuste')return Response.json({error:'Use a opção Corrigir quantidade.'},{status:403});
if(['clearFinancials','adjustStock','editMove','deleteMove'].includes(body.command.action)){
 if(['clearFinancials','adjustStock'].includes(body.command.action)&&body.command.confirmation!==(body.command.action==='clearFinancials'?'APAGAR':'CORRIGIR'))return Response.json({error:'Digite a confirmação solicitada.'},{status:400});
 const password=body.command.password;
 if(typeof password!=='string'||!password||password.length>256)return Response.json({error:'Informe a senha do administrador.'},{status:400});
 const now=Date.now(),key=await digest('clear-financials:'+(req.headers.get('cf-connecting-ip')||'unknown'));
 const limit=await env.DB!.prepare('INSERT INTO login_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING attempts').bind(key,now+900000,now,now,now+900000).first<{attempts:number}>();
 if(!limit||limit.attempts>5)return Response.json({error:'Muitas tentativas. Aguarde 15 minutos.'},{status:429});
 if(!await verifyPassword(password))return Response.json({error:'Senha do administrador incorreta.'},{status:403});
 delete body.command.password;
}
const row=await env.DB!.prepare('SELECT version,payload FROM records WHERE id=?').bind('business').first<any>();if((row?.version||0)!==body.version)return Response.json({error:'O estoque foi atualizado em outra tela. Recarregue antes de tentar novamente.'},{status:409});const current=row?JSON.parse(row.payload):initial();const state=body.command.action==='clearFinancials'?clearFinancials(current):apply(current,body.command);const payload=JSON.stringify(state);let r;if(row)r=await env.DB!.prepare('UPDATE records SET payload=?,version=version+1 WHERE id=? AND version=?').bind(payload,'business',body.version).run();else r=await env.DB!.prepare('INSERT OR IGNORE INTO records(id,version,payload) VALUES(?,1,?)').bind('business',payload).run();if(!r.meta.changes)return Response.json({error:'Outra alteração ocorreu. Recarregue a página.'},{status:409});return Response.json({version:body.version+1,state});}catch(e){return Response.json({error:e instanceof Error?e.message:'Não foi possível salvar.'},{status:400});}}

export const OPTIONS=preflight;
export async function GET(req:Request){return cors(req,await handleGET(req));}
export async function POST(req:Request){return cors(req,await handlePOST(req));}
