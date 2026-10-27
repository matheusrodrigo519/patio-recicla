export type Material={id:string,name:string,goal:number,alert:number,qty:number,value:number|null};
export type Move={financialCleared?:boolean,id:string,material:string,type:string,qty:number,total:number|null,unitPrice?:number,cost:number|null,expense:number,date:string,party:string,note:string,created:string};
export type Load={id:string,material:string,qty:number,party:string,date:string,status:string,total:number|null,unitPrice?:number,expense:number};
export type State={materials:Material[],moves:Move[],loads:Load[]};
export const initial=():State=>({materials:[['cobre','Cobre',1000,50],['aluminio','Alumínio',500,30],['ferro','Ferro',5000,200],['latao','Latão',200,20]].map(([id,name,goal,alert])=>({id:String(id),name:String(name),goal:Number(goal),alert:Number(alert),qty:0,value:0})),moves:[],loads:[]});
export const reserved=(s:State,id:string)=>s.loads.filter(l=>l.material===id&&!['Concluída','Cancelada'].includes(l.status)).reduce((a,l)=>a+l.qty,0);
function num(v:any,min=0){const n=Number(v);if(v===''||v==null||!Number.isFinite(n)||n<min||n>1e12)throw Error('Informe um valor numérico válido.');return n;}
function str(v:any,max=200){return String(v||'').trim().slice(0,max);}
function date(v:any){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Informe a data.');return v;}
export const saleTotal=(qty:number,price:number)=>{const total=Math.round((num(qty,.001)*num(price)+Number.EPSILON)*100)/100;if(!Number.isFinite(total)||total>1e12)throw Error('Valor da venda excede o limite.');return total;};
export function apply(s:State,c:any):State{
 if(c.action==='adjustStock'){
 const material=s.materials.find(m=>m.id===c.material);if(!material)throw Error('Material não encontrado.');
 const qty=c.zero===true?material.qty:num(c.qty,.001);
 if(qty<=0)throw Error('Este material já está zerado.');
 return apply(s,{action:'move',material:material.id,type:'Ajuste',qty,date:c.date,note:'Correção de lançamento: '+(str(c.note,450)||'Quantidade lançada incorretamente')});
 }
 const id=()=>crypto.randomUUID(); const m=s.materials.find(x=>x.id===c.material);
 if(c.action==='material'){const name=str(c.name,60);if(!name)throw Error('Informe o nome.');if(s.materials.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==c.material))throw Error('Material já cadastrado.');const goal=num(c.goal,.001),alert=num(c.alert);if(alert>goal)throw Error('O alerta não pode superar a meta.');if(m){Object.assign(m,{name,goal,alert});}else s.materials.push({id:id(),name,goal,alert,qty:0,value:0});return s;}
 if(c.action==='status'){const l=s.loads.find(x=>x.id===c.id);if(!l||['Concluída','Cancelada'].includes(l.status))throw Error('Carga já encerrada ou não encontrada.');if(!['Preparando','Pronta','Agendada','Concluída','Cancelada'].includes(c.status))throw Error('Status inválido.');if(c.status==='Concluída'){apply(s,{action:'move',material:l.material,type:'Venda',qty:l.qty,total:l.total,unitPrice:l.unitPrice,expense:l.expense,date:c.date,party:l.party,note:'Carga '+l.id.slice(0,8),loadId:l.id});}l.status=c.status;return s;}
 if(!m)throw Error('Selecione o material.');const qty=num(c.qty,.001);
 if(c.action==='load'){if(qty>m.qty-reserved(s,m.id)+.000001)throw Error('Peso disponível insuficiente para reservar.');s.loads.push({id:id(),material:m.id,qty,party:str(c.party),date:date(c.date),status:'Preparando',total:saleTotal(qty,num(c.unitPrice)),unitPrice:num(c.unitPrice),expense:num(c.expense||0)});return s;}
 if(c.action!=='move'||!['Entrada','Venda','Perda','Ajuste'].includes(c.type))throw Error('Operação inválida.');
 let cost:number|null=null;const total=c.type==='Venda'&&!c.loadId?saleTotal(qty,num(c.unitPrice)):['Perda','Ajuste'].includes(c.type)?null:c.total===''||c.total==null?null:num(c.total);const expense=num(c.expense||0);const note=str(c.note,500);date(c.date);
 if(c.type==='Venda'&&total===null)throw Error('Informe o valor da venda.');if(c.type==='Perda'&&!note)throw Error('Informe o motivo da perda.');
 if(c.type==='Entrada'){m.value=m.value===null||total===null?null:m.value+total;m.qty+=qty;}else{const own=c.loadId?s.loads.find(l=>l.id===c.loadId)?.qty||0:0;if(qty>m.qty-reserved(s,m.id)+own+.000001)throw Error('Estoque disponível insuficiente. Confira as reservas.');cost=m.value===null?null:m.value/m.qty*qty;m.qty=Math.max(0,m.qty-qty);m.value=m.qty<.000001?0:m.value===null?null:Math.max(0,m.value-(cost||0));}
 s.moves.push({id:id(),material:m.id,type:c.type,qty,total,...(c.type==='Venda'?{unitPrice:c.unitPrice==null?total!/qty:num(c.unitPrice)}:{}),cost,expense,date:c.date,party:str(c.party),note,created:new Date().toISOString()});return s;
}

// Removes stored historical amounts without rewriting physical inventory.
export function clearFinancials(s:State):State{
 for(const m of s.materials)m.value=m.qty>0?null:0;
 for(const m of s.moves){m.total=null;m.cost=null;m.expense=0;delete m.unitPrice;m.financialCleared=true;}
 for(const l of s.loads)if(['Concluída','Cancelada'].includes(l.status)){l.total=null;l.expense=0;delete l.unitPrice;}
 return s;
}
