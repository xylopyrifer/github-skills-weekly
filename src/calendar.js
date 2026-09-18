const DAY=86400000;
export function currentWeekStart(now=new Date()){const d=new Date(now);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
export function calendarSlots(data,now=new Date()){
 const anchor=data.demo&&data.weeks.length?data.weeks.map(w=>w.start).sort().at(-1):currentWeekStart(now);
 return Array.from({length:5},(_,i)=>{const start=new Date(Date.parse(anchor+'T00:00:00Z')-i*7*DAY).toISOString().slice(0,10);return {start,end:new Date(Date.parse(start+'T00:00:00Z')+7*DAY).toISOString().slice(0,10),week:data.weeks.find(w=>w.start===start)};});
}
