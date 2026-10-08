import { useState } from "react";
import Layout from "../../Layout";
import "./AcademicOversight.css";

export default function AcademicOversight() {
  const [classes,setClasses]=useState(["Primary 1","Primary 2","Primary 3","Primary 4"]);
  const [streams,setStreams]=useState(["Blue","Green","Red"]);
  const [subjects,setSubjects]=useState(["Mathematics","English","Science","ICT","Social Studies"]);
  const [newClass,setNewClass]=useState(""),[newStream,setNewStream]=useState(""),[newSubject,setNewSubject]=useState("");
  const [locked,setLocked]=useState(false),[published,setPublished]=useState(false);

  const add=(value,setter,clear)=>{const v=value.trim();if(!v)return;setter(x=>x.includes(v)?x:[...x,v]);clear("");};

  return <Layout role="admin"><div className="admin-page">
    <section className="page-hero"><div className="hero-copy"><span className="eyebrow">ACADEMICS OVERSIGHT</span><h1>Academic control centre</h1><p>Manage classes, streams, subjects, examination dates, marks and parent-facing results from one place.</p></div><div className="hero-shape large">▦</div><div className="hero-shape small"/></section>

    <div className="grid three">
      <section className="card blue"><Head n="01" title="Classes"/><div className="mini-form"><input value={newClass} onChange={e=>setNewClass(e.target.value)} placeholder="Add class..."/><button className="btn dark" onClick={()=>add(newClass,setClasses,setNewClass)}>Add</button></div><Chips items={classes}/></section>
      <section className="card green"><Head n="02" title="Streams"/><div className="mini-form"><input value={newStream} onChange={e=>setNewStream(e.target.value)} placeholder="Add stream..."/><button className="btn dark" onClick={()=>add(newStream,setStreams,setNewStream)}>Add</button></div><Chips items={streams}/></section>
      <section className="card yellow"><Head n="03" title="Subjects"/><div className="mini-form"><input value={newSubject} onChange={e=>setNewSubject(e.target.value)} placeholder="Add subject..."/><button className="btn dark" onClick={()=>add(newSubject,setSubjects,setNewSubject)}>Add</button></div><Chips items={subjects}/></section>
    </div>

    <section className="panel"><div className="panel-head"><div><span className="kicker">ACADEMIC CALENDAR</span><h2>Term & examination dates</h2></div><span className="pill blue">2026 / 2027</span></div><div className="date-grid"><Date label="Term 1 starts" value="2026-09-07"/><Date label="Term 1 ends" value="2026-12-04"/><Date label="Exam starts" value="2026-11-16"/><Date label="Exam ends" value="2026-11-27"/></div></section>

    <div className="grid three">
      <Action icon={locked?"🔒":"🔓"} title={locked?"Marks entry locked":"Marks entry open"} text="Control whether teachers can enter or edit marks." button={locked?"Unlock marks":"Lock marks"} onClick={()=>setLocked(!locked)}/>
      <Action icon="✓" title={published?"Results published":"Publish results"} text="Make approved results available on the parents portal." button={published?"Published":"Publish now"} onClick={()=>setPublished(true)} green/>
      <Action icon="↗" title="Performance analytics" text="Review class, subject and learner performance trends." button="View analytics" onClick={()=>alert("Connect your analytics route here.")}/>
    </div>
  </div></Layout>;
}
const Head=({n,title})=><div className="card-head"><span className="number">{n}</span><h2>{title}</h2></div>;
const Chips=({items})=><div className="chips">{items.map(x=><span className="chip" key={x}>{x}</span>)}</div>;
const Date=({label,value})=><label className="field">{label}<input type="date" defaultValue={value}/></label>;
function Action({icon,title,text,button,onClick,green}){return <section className={`card action-card ${green?"green":"red"}`}><div className="action-icon">{icon}</div><div className="action-copy"><h3>{title}</h3><p>{text}</p></div><button className="btn outline" onClick={onClick}>{button}</button></section>}
