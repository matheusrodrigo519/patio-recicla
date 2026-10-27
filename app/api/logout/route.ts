import {cors,preflight,PAGES_ORIGIN} from '../../../lib/cors';
import {env} from 'cloudflare:workers';
import {COOKIE,digest,noStore,sameOrigin,token} from '../../../lib/auth';
async function handlePOST(req:Request){if(!sameOrigin(req))return Response.json({error:'Origem inválida.'},{status:403});const t=token(req);if(t)await env.DB!.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(t)).run();return Response.json({ok:true},{headers:{...noStore,'Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}});}

export const OPTIONS=preflight;
export async function POST(req:Request){return cors(req,await handlePOST(req));}
