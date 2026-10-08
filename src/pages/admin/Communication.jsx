import { useState } from "react";
import Layout from "../../Layout";
import "./Communication.css";

export default function Communication(){
  const starter=[{id:1,title:"Term opening reminder",audience:"All Parents",channel:"SMS",status:"Approved",date:"08 Oct 2026"},{id:2,title:"Staff meeting",audience:"Teachers",channel:"Portal",status:"Pending",date:"07 Oct 2026"},{id:3,title:"Mid-term assessment",audience:"All Parents",channel:"SMS",status:"Approved",date:"05 Oct 2026"}];
  const [messages,setMessages]=useState(starter),[text,setText]=useState(""),[audience,setAudience]=useState("All Parents"),[sent,setSent]=useState(false);
  const send=()=>{if(!text.trim())return;setMessages(x=>[{id:Date.now(),title:text.trim().slice(0,32),audience,channel:"SMS",status:"Pending",date:"Today"},...x]);setText("");setSent(true);};
  return <Layout role="admin"><div className="admin-page">
    <section className="page-hero"><div className="hero-copy"><span className="eyebrow">COMMUNICATION</span><h1>Keep the school connected</h1><p>Send announcements to parents and teachers while keeping every message visible in one communication log.</p></div><div className="hero-shape large">✦</div><div className="hero-shape small"/></section>
    <div className="grid two">
      <section className="card blue message-composer"><div className="card-head"><span className="number">01</span><h2>New announcement</h2></div><label className="field">Audience<select value={audience} onChange={e=>setAudience(e.target.value)}><option>All Parents</option><option>All Teachers</option><option>Parents & Teachers</option></select></label><br/><label className="field">Message<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Write an important school announcement..." rows="7"/></label><div className="composer-footer"><span>SMS / portal notification</span><button className="btn yellow" onClick={send}>Send announcement</button></div>{sent&&<div className="success-note">✓ Announcement submitted for approval.</div>}</section>
      <section className="card green"><div className="card-head"><span className="number">02</span><h2>Approval workflow</h2></div><div className="workflow"><Step n="1" title="Draft" text="Admin creates announcement"/><div className="workflow-line"/><Step n="2" title="Review" text="DOS reviews message"/><div className="workflow-line"/><Step n="3" title="Publish" text="Approved message reaches audience"/></div></section>
    </div>
    <section className="panel"><div className="panel-head"><div><span className="kicker">MESSAGE CENTRE</span><h2>Recent announcements</h2></div><span className="pill green">{messages.length} messages</span></div><div className="message-list">{messages.map(m=><article className="message-row" key={m.id}><div className="message-avatar">✦</div><div className="message-main"><strong>{m.title}</strong><span>{m.audience} · {m.channel} · {m.date}</span></div><span className={`pill ${m.status==="Approved"?"green":"yellow"}`}>{m.status}</span><button className="icon-square">→</button></article>)}</div></section>
  </div></Layout>;
}
const Step=({n,title,text})=><div className="workflow-step"><span>{n}</span><div><b>{title}</b><small>{text}</small></div></div>;
