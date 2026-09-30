export type RemoteMail={id:string;sender:string;recipient:string;sender_name:string;recipient_name:string;message:string|null;deliver_at:number;created_at:number;reply_to?:string;memory?:number;attachment_count?:number};
export function conversations(letters:RemoteMail[],owner:string){
 const groups=new Map<string,{id:string;name:string;letters:RemoteMail[]}>();
 for(const letter of letters){
  if(letter.sender!==owner&&letter.recipient!==owner)continue;
  const outgoing=letter.sender===owner,id=outgoing?letter.recipient:letter.sender;
  const group=groups.get(id)??{id,name:outgoing?letter.recipient_name:letter.sender_name,letters:[]};
  group.letters.push(letter);groups.set(id,group);
 }
 return [...groups.values()].map(g=>({...g,letters:g.letters.sort((a,b)=>a.created_at-b.created_at||a.id.localeCompare(b.id))})).sort((a,b)=>b.letters.at(-1)!.created_at-a.letters.at(-1)!.created_at);
}
export function mailPreview(letter:RemoteMail){return letter.message===null?'一封信正在路上…':letter.message||'寄来一张风景';}
