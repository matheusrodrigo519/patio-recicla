import {PAGES_ORIGIN} from './cors';
import {env} from 'cloudflare:workers';
export const COOKIE='__Host-patio_session';
export const USERNAME='Edilson_Admin';
export const noStore={'Cache-Control':'no-store'};
const hex=(data:ArrayBuffer)=>Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join('');
export const digest=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
export function token(req:Request){const bearer=req.headers.get('authorization');if(bearer?.startsWith('Bearer '))return bearer.slice(7);return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
export async function authenticated(req:Request){const t=token(req);if(!/^[a-f0-9]{64}$/.test(t))return false;const session=await env.DB!.prepare('SELECT expires_at FROM sessions WHERE token_hash=?').bind(await digest(t)).first<{expires_at:number}>();return !!session&&session.expires_at>Date.now();}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin===PAGES_ORIGIN)return true;return req.headers.get('sec-fetch-site')!=='cross-site'&&!!origin&&(origin===new URL(req.url).origin||origin==='https://patio-recicla-matheus.daringboar3.chatgpt.site');}
export function denied(){return Response.json({error:'Entre com seu usuário e senha.'},{status:401,headers:noStore});}
export async function verifyPassword(password:string){const secrets=env as unknown as {PATIO_PASSWORD_HASH?:string;PATIO_PASSWORD_SALT?:string};if(!secrets.PATIO_PASSWORD_HASH||!secrets.PATIO_PASSWORD_SALT)throw Error('Login indisponível. Tente novamente mais tarde.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const actual=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(secrets.PATIO_PASSWORD_SALT),iterations:100000,hash:'SHA-256'},key,256));let diff=actual.length^secrets.PATIO_PASSWORD_HASH.length;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^secrets.PATIO_PASSWORD_HASH.charCodeAt(i);return diff===0;}
