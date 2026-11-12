type Activity = { key:string; when:Date; title:string; detail:string; kind?:string };

// This is a truthful, data-backed basic timeline. Bryntum Scheduler Pro is not installed.
export function FraudTimeline({tasks}:{tasks:any[]}) {
  const events:Activity[]=[];
  for(const task of tasks){
    events.push({key:`${task.id}-created`,when:new Date(task.createdAt),title:'Task created',detail:task.title});
    for(const evidence of task.evidence || []){
      events.push({key:`${evidence.id}-uploaded`,when:new Date(evidence.createdAt),title:'Evidence uploaded',detail:`${task.title} · ${evidence.originalName}`});
    }
    if(task.verification){
      const decision=String(task.verification.decision || 'UNKNOWN');
      events.push({key:`${task.id}-verification`,when:new Date(task.verification.createdAt),title:`AI decision: ${decision}`,detail:`${task.title} · Score ${task.verification.overallScore}/100`,kind:decision==='REJECTED'?'reject':decision==='REVIEW'?'review':''});
    }
    if(task.payout){
      events.push({key:`${task.id}-payout`,when:new Date(task.payout.createdAt),title:`Payout: ${task.payout.status}`,detail:task.title});
    }
  }
  events.sort((a,b)=>b.when.getTime()-a.when.getTime());
  if(!events.length) return <p className="helper">No task activity yet. Create a task to see real activity here.</p>;
  return <div>
    <p className="helper">Real task, upload, verification, and payout records. This is a basic activity view, not the licensed Bryntum Scheduler Pro.</p>
    <div className="activity-list">{events.slice(0,30).map(event=><div className={`activity-item ${event.kind||''}`} key={event.key}>
      <div><strong>{event.title}</strong><p>{event.detail}</p></div>
      <time dateTime={event.when.toISOString()}>{event.when.toLocaleString()}</time>
    </div>)}</div>
  </div>;
}
