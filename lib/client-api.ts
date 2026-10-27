const BACKEND='https://patio-recicla-matheus.daringboar3.chatgpt.site';
const KEY='patio-recicla-session';
export async function apiFetch(path:string,init:RequestInit={}){
 const remote=typeof window!=='undefined'&&window.location.origin==='https://matheusrodrigo519.github.io';
 const headers=new Headers(init.headers);if(remote){const token=sessionStorage.getItem(KEY);if(token)headers.set('Authorization','Bearer '+token);}
 const response=await fetch((remote?BACKEND:'')+path,{...init,headers,credentials:remote?'omit':'same-origin'});
 if(remote&&path==='/api/login'&&response.ok){const body=await response.clone().json() as {token?:string};if(body.token)sessionStorage.setItem(KEY,body.token);}
 if(remote&&(path==='/api/logout'&&response.ok||response.status===401))sessionStorage.removeItem(KEY);
 return response;
}
