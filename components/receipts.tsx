'use client';
import {useState} from 'react';
import {apiFetch} from '../lib/client-api';
type Receipt={key:string,name:string,size:number,date:string};
async function compress(file:File):Promise<File>{
 if(file.type==='application/pdf')return file;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Use JPG, PNG, WebP ou PDF.');
 const bitmap=await createImageBitmap(file);
 if(bitmap.width*bitmap.height>50000000){bitmap.close();throw Error('Foto muito grande. Escolha uma imagem menor.');}
 const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Não foi possível preparar a foto.')),'image/jpeg',.86));
 return (blob.size<file.size||file.type==='image/webp')?new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'}):file;
}
export default function Receipts({move}:{move:string}){
 const [open,setOpen]=useState(false),[files,setFiles]=useState<Receipt[]>([]),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const base='/api/comprovantes?move='+encodeURIComponent(move);
 async function list(next?:string){const r=await apiFetch(base+(next?'&cursor='+encodeURIComponent(next):''));const d=await r.json() as {error:string,files:Receipt[],cursor:string|null};if(!r.ok)throw Error(d.error);setFiles(old=>next?[...old,...d.files]:d.files);setCursor(d.cursor);}
 async function show(){setOpen(true);setBusy(true);setError('');try{await list()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function upload(input:HTMLInputElement){const selected=Array.from(input.files||[]);setBusy(true);setError('');setMessage('');let count=0;try{for(const file of selected){if(file.size>25*1024*1024)throw Error('Arquivo original acima de 25 MB.');const prepared=await compress(file);if(prepared.size>5*1024*1024)throw Error('Arquivo acima de 5 MB após preparar.');const form=new FormData();form.append('file',prepared);const r=await apiFetch(base,{method:'POST',body:form});if(!r.ok)throw Error(((await r.json()) as {error:string}).error);count++;}setMessage(count+' comprovante(s) salvo(s).');await list()}catch(e){setError((count?count+' arquivo(s) já salvo(s). ':'')+(e as Error).message);await list().catch(()=>{})}finally{input.value='';setBusy(false)}}
 async function download(file:Receipt){setBusy(true);setError('');try{const r=await apiFetch(base+'&key='+encodeURIComponent(file.key));if(!r.ok)throw Error('Não foi possível baixar.');const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <><button className="secondary" onClick={show}>Comprovantes</button>{open&&<div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-label="Comprovantes do lançamento"><h2>Comprovantes do lançamento</h2><p>Escolha fotos ou PDFs. As fotos são reduzidas automaticamente; confira se os dados continuam legíveis. PDF: até 5 MB.</p><label>Adicionar comprovantes<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple disabled={busy} onChange={e=>upload(e.currentTarget)}/></label>{files.map(f=><div className="loadRow" key={f.key}><div><strong>{f.name}</strong><small>{new Date(f.date).toLocaleDateString('pt-BR')} · {Math.ceil(f.size/1024)} KB</small></div><button className="secondary" disabled={busy} onClick={()=>download(f)}>Baixar</button></div>)}{!busy&&!files.length&&<p>Nenhum comprovante anexado.</p>}{cursor&&<button disabled={busy} onClick={()=>{setBusy(true);list(cursor).catch(e=>setError(e.message)).finally(()=>setBusy(false))}}>Carregar mais</button>}{busy&&<p role="status">Processando…</p>}{message&&<p role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}<p className="hint">Anexar não altera a situação do pagamento. Os arquivos ficam acessíveis pelo lançamento enquanto ele existir.</p><button className="primary" disabled={busy} onClick={()=>setOpen(false)}>Fechar</button></section></div>}</>;
}
