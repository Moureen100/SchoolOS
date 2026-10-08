import { useState } from "react";
import Layout from "../../Layout";
import "./SystemConfiguration.css";

export default function SystemConfiguration(){
  const [saved,setSaved]=useState(false),[sms,setSms]=useState(true),[backup,setBackup]=useState(true);
  return <Layout role="admin"><div className="admin-page">
    <section className="page-hero"><div className="hero-copy"><span className="eyebrow">SYSTEM CONFIGURATION</span><h1>SchoolOS settings</h1><p>Configure school identity, fees, grading, messaging and data protection from the admin workspace.</p></div><div className="hero-shape large">⚙</div><div className="hero-shape small"/></section>
    <div className="grid two">
      <section className="card blue config-card"><span className="kicker">IDENTITY</span><h2>School information</h2><div className="form-grid"><Field label="School name" value="SchoolOS Academy"/><Field label="Motto" value="Learning today, leading tomorrow."/><Field label="Paybill number" value="256700000000"/><Field label="MoMo number" value="256700000000"/></div><div className="logo-upload"><span className="logo-preview">S</span><span className="details"><strong>School logo</strong><small>PNG or JPG · recommended 512 × 512</small></span><button className="btn outline" type="button">Change logo</button></div></section>
      <section className="card green config-card"><span className="kicker">FINANCE</span><h2>Fees structure</h2><div className="fee-row"><span>Primary 1 – 3</span><strong>UGX 650,000</strong></div><div className="fee-row"><span>Primary 4 – 6</span><strong>UGX 750,000</strong></div><div className="fee-row"><span>Primary 7</span><strong>UGX 850,000</strong></div><button className="btn yellow">Edit fee structure</button></section>
      <section className="card yellow config-card"><span className="kicker">ACADEMICS</span><h2>Grading system</h2><div className="grade-table">{[["A","80 – 100","Excellent"],["B","70 – 79","Very Good"],["C","60 – 69","Good"],["D","50 – 59","Pass"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><em>{x[2]}</em></div>)}</div></section>
      <section className="card blue config-card"><span className="kicker">COMMUNICATION</span><h2>SMS settings</h2><Toggle label="Enable SMS notifications" checked={sms} onChange={()=>setSms(!sms)}/><label className="field">Sender name<input defaultValue="SchoolOS"/></label><br/><label className="field">Default channel<select defaultValue="sms"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label></section>
    </div>
    <section className="panel backup-panel"><div><span className="kicker">DATA PROTECTION</span><h2>Backup data</h2><p>Keep a recent copy of school records available for recovery.</p></div><Toggle label="Automatic backups" checked={backup} onChange={()=>setBackup(!backup)}/><button className="btn dark" onClick={()=>setSaved(true)}>Back up now</button></section>
    <div className="save-bar"><span>{saved?"✓ Settings saved successfully.":"Review your settings before saving."}</span><button className="btn yellow" onClick={()=>setSaved(true)}>Save configuration</button></div>
  </div></Layout>;
}
const Field=({label,value})=><label className="field">{label}<input defaultValue={value}/></label>;
const Toggle=({label,checked,onChange})=><div className="toggle-row"><span>{label}</span><button type="button" className={`toggle ${checked?"on":""}`} onClick={onChange}><span/></button></div>;
