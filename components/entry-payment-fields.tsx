'use client';
import SearchChoice from './search-choice';
import {useState} from 'react';
import type {Customer,Move} from '../lib/engine';
export default function EntryPaymentFields({customers,value}:{customers:Customer[],value?:Move}){
 const [customerId,setCustomerId]=useState(value?.customerId||'');
 const [party,setParty]=useState(value?.party||''),[contact,setContact]=useState(value?.contact||''),[pix,setPix]=useState(value?.pixKey||'');
 return <><SearchChoice label="Cliente / fornecedor" name="customerId" textName="party" items={customers.map(c=>({id:c.id,name:c.name,detail:c.contact}))} defaultId={customerId} defaultText={party} allowFreeText onTextChange={text=>{setParty(text);if(customerId){setCustomerId('');setContact('');setPix('')}}} onSelect={item=>{const c=customers.find(x=>x.id===item.id)!;setCustomerId(c.id);setParty(c.name);setContact(c.contact);setPix(c.pixKey)}}/><label>Contato<input name="contact" type="tel" value={contact} maxLength={100} onChange={e=>setContact(e.target.value)}/></label><label>Chave Pix<input name="pixKey" value={pix} maxLength={200} onChange={e=>setPix(e.target.value)}/></label><label>Pagamento<select name="paymentMethod" defaultValue={value?.paymentMethod||''}><option value="">Não informado</option>{['Pix','Dinheiro','Transferência','Cartão','Outro'].map(x=><option key={x}>{x}</option>)}</select></label><label>Situação do pagamento<select name="paymentStatus" defaultValue={value?.paymentStatus||(value?'Não informado':'Não pago')}><option>Não pago</option><option>Pago</option>{value&&<option>Não informado</option>}</select></label><small className="hint">Controle de pagamento. Nenhuma transferência é realizada pelo site.</small></>;
}
