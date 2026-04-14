// import { useState, useMemo, useEffect } from "react";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";
// import { db } from "../../firebase"; 

// const COLLECTION_NAME = "excelupload";

// function mapDoc(doc) {
//   const d = doc.data();
//   const rawStatus = d.poStatus || d.status || "";
//   const statusMap = {
//     paid: "Paid", full: "Paid",
//     partial: "Partially Paid", "partially paid": "Partially Paid",
//     unpaid: "Unpaid", pending: "Unpaid", "": "—",
//   };
//   const status = statusMap[rawStatus.toLowerCase()] ?? rawStatus;

//   let amount = 0;
//   if (Array.isArray(d.items))  {
//     amount = d.items.reduce((s, it) => {
//       const qty   = Number(it.receivedQty || it.okQty || it.quantity || 0);
//       const price = Number(it.unitPrice   || it.price || it.rate    || 0);
//       return s + qty * price;
//     }, 0);
//   }
//   if (!amount) amount = Number(d.totalAmount || d.amount || 0);

//   return {
//     id:            doc.id,
//     invoiceNo:     d.invoiceNo || d.invoiceHeader?.invoiceNo || "—",
//     vendor:        d.vendor    || d.invoiceHeader?.supplier  || "—",
//     date:          d.invoiceDate || "",
//     po:            d.linkedPoNo  || "—",
//     amount,
//     status,
//     rawStatus,
//     items:          Array.isArray(d.items) ? d.items : [],
//     invoiceHeader:  d.invoiceHeader  || {},
//     qualityCheck:   d.qualityCheck   || "—",
//     storeQcStatus:  d.storeQcStatus  || "—",
//     storeQcApprovedBy:  d.storeQcApprovedBy  || "—",
//     storeQcApprovedAt:  d.storeQcApprovedAt  || null,
//     remarks:        d.remarks        || "",
//     linkedPoId:     d.linkedPoId     || "",
//     createdAt:      d.createdAt      || null,
//   };
// }

// const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
// const STATUS_STYLE = {
//   "Paid":           { bg:"#dcfce7", color:"#166534", dot:"#22c55e" },
//   "Unpaid":         { bg:"#fee2e2", color:"#991b1b", dot:"#ef4444" },
//   "Partially Paid": { bg:"#fef9c3", color:"#854d0e", dot:"#eab308" },
// };
// const DEFAULT_SS = { bg:"#f1f5f9", color:"#475569", dot:"#94a3b8" };

// function toDs(y,m,d){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
// function parseDs(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
// function fmtAmount(n){ return "₹"+Number(n).toLocaleString("en-IN"); }
// function fmtDate(s){
//   if(!s) return "—";
//   try{ return parseDs(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
//   catch{ return s; }
// }
// function fmtTs(ts){
//   if(!ts) return "—";
//   try{
//     const d = ts.toDate ? ts.toDate() : new Date(ts);
//     return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
//   } catch{ return "—"; }
// }

// function StatusBadge({ status }){
//   const s = STATUS_STYLE[status] || DEFAULT_SS;
//   return (
//     <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,background:s.bg,color:s.color,fontSize:11,fontWeight:500}}>
//       <span style={{width:5,height:5,borderRadius:"50%",background:s.dot}}/>
//       {status}
//     </span>
//   );
// }

// const navBtnStyle    = {background:"none",border:"none",cursor:"pointer",color:"#5a6474",fontSize:17,padding:"2px 7px",borderRadius:6,lineHeight:1};
// const selStyle       = {border:"1px solid #e2e8f0",borderRadius:5,padding:"2px 4px",fontSize:11,color:"#1e293b",background:"#fff",outline:"none",cursor:"pointer"};
// const presetBtnStyle = {fontSize:11,padding:"3px 8px",border:"1px solid #dde3ed",borderRadius:20,background:"#fff",color:"#5a6474",cursor:"pointer"};
// const Divider        = () => <div style={{width:1,height:20,background:"#e2e8f0",flexShrink:0}}/>;

// /* ── Calendar ── */
// function Calendar({ selA, selB, onDayClick, onClose }){
//   const today=new Date(), todayStr=toDs(today.getFullYear(),today.getMonth(),today.getDate());
//   const [viewY,setViewY]=useState(selA?parseInt(selA.split("-")[0]):today.getFullYear());
//   const [viewM,setViewM]=useState(selA?parseInt(selA.split("-")[1])-1:today.getMonth());
//   const lo=selA&&selB?(selA<selB?selA:selB):selA;
//   const hi=selA&&selB?(selA<selB?selB:selA):selA;
//   function chMon(d){ let m=viewM+d,y=viewY; if(m>11){m=0;y++;}if(m<0){m=11;y--;} setViewM(m);setViewY(y); }
//   function applyPreset(days){ const now=new Date(),s=new Date(now);s.setDate(s.getDate()-days); onDayClick(toDs(s.getFullYear(),s.getMonth(),s.getDate()),toDs(now.getFullYear(),now.getMonth(),now.getDate())); onClose(); }
//   function applyThisMonth(){ const n=new Date(),last=new Date(n.getFullYear(),n.getMonth()+1,0).getDate(); onDayClick(toDs(n.getFullYear(),n.getMonth(),1),toDs(n.getFullYear(),n.getMonth(),last)); onClose(); }
//   const firstDay=new Date(viewY,viewM,1).getDay(), dim=new Date(viewY,viewM+1,0).getDate(), prev=new Date(viewY,viewM,0).getDate();
//   const cells=[];
//   for(let i=0;i<firstDay;i++){const d=prev-firstDay+1+i;cells.push({d,s:toDs(viewY,viewM-1,d),other:true});}
//   for(let d=1;d<=dim;d++) cells.push({d,s:toDs(viewY,viewM,d),other:false,today:toDs(viewY,viewM,d)===todayStr});
//   for(let d=1;d<=42-cells.length;d++) cells.push({d,s:toDs(viewY,viewM+1,d),other:true});
//   return (
//     <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:38,left:0,zIndex:999,background:"#fff",border:"1px solid #dde3ed",borderRadius:13,padding:"14px 13px 11px",boxShadow:"0 8px 26px rgba(59,130,246,.10)",minWidth:288}}>
//       <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
//         <button style={navBtnStyle} onClick={()=>chMon(-1)}>&#8249;</button>
//         <div style={{display:"flex",gap:4}}>
//           <select style={selStyle} value={viewM} onChange={e=>setViewM(+e.target.value)}>{MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
//           <select style={selStyle} value={viewY} onChange={e=>setViewY(+e.target.value)}>{Array.from({length:8},(_,i)=>2020+i).map(y=><option key={y}>{y}</option>)}</select>
//         </div>
//         <button style={navBtnStyle} onClick={()=>chMon(1)}>&#8250;</button>
//       </div>
//       <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:2}}>
//         {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"#94a3b8",fontWeight:600,padding:"2px 0"}}>{d}</div>)}
//       </div>
//       <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
//         {cells.map((c,idx)=>{
//           const col=idx%7,isStart=lo&&c.s===lo,isEnd=hi&&c.s===hi,isMid=lo&&hi&&c.s>lo&&c.s<hi;
//           const isDot=!c.other&&(isStart||isEnd||(!selB&&selA&&c.s===selA));
//           let bg={};
//           if(!c.other){
//             if(isMid) bg={background:"#dbeafe",borderRadius:col===0?"50% 0 0 50%":col===6?"0 50% 50% 0":0};
//             else if(isStart&&hi&&lo!==hi) bg={background:"linear-gradient(to right,transparent 50%,#dbeafe 50%)"};
//             else if(isEnd&&lo&&lo!==hi)   bg={background:"linear-gradient(to left,transparent 50%,#dbeafe 50%)"};
//           }
//           return(
//             <div key={idx} onClick={()=>!c.other&&onDayClick(c.s)} style={{position:"relative",height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:c.other?"default":"pointer"}}>
//               <div style={{position:"absolute",inset:0,...bg}}/>
//               <div style={{position:"relative",zIndex:1,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:isDot?"#3b82f6":"transparent",color:c.other?"#c8d0dc":isDot?"#fff":c.today?"#3b82f6":"#1e293b",fontSize:12,fontWeight:c.today?700:400}}>{c.d}</div>
//             </div>
//           );
//         })}
//       </div>
//       <div style={{marginTop:9,borderTop:"1px solid #f1f5f9",paddingTop:8,display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
//         <button style={presetBtnStyle} onClick={()=>applyPreset(6)}>Last 7d</button>
//         <button style={presetBtnStyle} onClick={()=>applyPreset(29)}>Last 30d</button>
//         <button style={presetBtnStyle} onClick={()=>applyPreset(89)}>Last 3m</button>
//         <button style={presetBtnStyle} onClick={applyThisMonth}>This month</button>
//         <button onClick={()=>{onDayClick(null,null);onClose();}} style={{...presetBtnStyle,marginLeft:"auto",borderColor:"#fecdd3",color:"#e11d48"}}>Clear</button>
//       </div>
//     </div>
//   );
// }

// /* ── Detail Modal (CENTERED) ── */
// function InvoiceDetailModal({ inv, onClose }){
//   if(!inv) return null;
//   const h = inv.invoiceHeader || {};
//   const qcColors = {
//     passed:               { bg:"#dcfce7", color:"#166534" },
//     passed_with_issues:   { bg:"#fef9c3", color:"#854d0e" },
//     failed:               { bg:"#fee2e2", color:"#991b1b" },
//     approved_with_issues: { bg:"#fef9c3", color:"#854d0e" },
//   };
//   const qcStyle = qcColors[inv.qualityCheck]  || { bg:"#f1f5f9", color:"#475569" };
//   const sqStyle = qcColors[inv.storeQcStatus] || { bg:"#f1f5f9", color:"#475569" };

//   function InfoRow({ label, value, mono }){
//     return(
//       <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
//         <span style={{fontSize:11.5,color:"#94a3b8",flexShrink:0,width:"45%"}}>{label}</span>
//         <span style={{fontSize:12,color:"#1e293b",fontWeight:500,textAlign:"right",fontFamily:mono?"monospace":"inherit",wordBreak:"break-all"}}>{value||"—"}</span>
//       </div>
//     );
//   }

//   function SectionHead({ title }){
//     return <p style={{fontSize:10,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:".06em",margin:"16px 0 6px"}}>{title}</p>;
//   }

//   return(
//     /* ✅ CENTERED OVERLAY */
//     <div
//       onClick={onClose}
//       style={{
//         position:"fixed", inset:0,
//         background:"rgba(15,23,42,.50)",
//         zIndex:1000,
//         display:"flex",
//         alignItems:"center",      /* ← vertically center */
//         justifyContent:"center",  /* ← horizontally center */
//       }}
//     >
//       {/* ✅ CENTERED CARD */}
//       <div
//         onClick={e=>e.stopPropagation()}
//         style={{
//           background:"#fff",
//           width:800,
//           maxWidth:"95vw",
//           maxHeight:"90vh",       /* ← scroll inside */
//           overflowY:"auto",
//           borderRadius:16,        /* ← rounded corners */
//           boxShadow:"0 20px 60px rgba(0,0,0,.22)",
//           display:"flex",
//           flexDirection:"column",
//         }}
//       >

//         {/* Header */}
//         <div style={{
//           padding:"18px 22px 14px",
//           borderBottom:"1px solid #f1f5f9",
//           display:"flex", alignItems:"flex-start", justifyContent:"space-between",
//           position:"sticky", top:0, background:"#fff", zIndex:10,
//           borderRadius:"16px 16px 0 0",
//         }}>
//           <div>
//             <p style={{fontSize:11,color:"#94a3b8",marginBottom:3}}>Invoice Detail</p>
//             <h2 style={{fontSize:16,fontWeight:700,color:"#1e293b"}}>{inv.invoiceNo}</h2>
//             <p style={{fontSize:12,color:"#64748b",marginTop:2}}>{inv.vendor}</p>
//           </div>
//           <div style={{display:"flex",alignItems:"center",gap:8}}>
//             <StatusBadge status={inv.status}/>
//             <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:20,lineHeight:1,padding:"2px 4px"}}>✕</button>
//           </div>
//         </div>

//         {/* Body */}
//         <div style={{padding:"4px 22px 20px",flex:1,overflowY:"auto"}}>

//           {/* Invoice Info */}
//           <SectionHead title="Invoice Information"/>
//           <InfoRow label="Invoice No."  value={inv.invoiceNo}/>
//           <InfoRow label="Invoice Date" value={fmtDate(inv.date)}/>
//           <InfoRow label="Vendor"       value={inv.vendor}/>
//           <InfoRow label="PO Number"    value={inv.po}/>
//           <InfoRow label="Consignee"    value={h.consignee}/>
//           <InfoRow label="GSTIN"        value={h.gstin} mono/>
//           <InfoRow label="Dated"        value={h.dated}/>
//           <InfoRow label="Remarks"      value={inv.remarks||"—"}/>

//           {/* Quality Check */}
//           <SectionHead title="Quality Check"/>
//           <div style={{display:"flex",gap:8,margin:"6px 0 4px"}}>
//             <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:qcStyle.bg,color:qcStyle.color,fontWeight:500}}>
//               QC: {inv.qualityCheck?.replace(/_/g," ")||"—"}
//             </span>
//             <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:sqStyle.bg,color:sqStyle.color,fontWeight:500}}>
//               Store: {inv.storeQcStatus?.replace(/_/g," ")||"—"}
//             </span>
//           </div>
//           <InfoRow label="Approved By" value={inv.storeQcApprovedBy}/>
//           <InfoRow label="Approved At" value={fmtTs(inv.storeQcApprovedAt)}/>

//           {/* Items */}
//           {inv.items.length > 0 && (
//             <>
//               <SectionHead title={`Items (${inv.items.length})`}/>
//               <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
//                 {inv.items.map((item,i)=>(
//                   <div key={i} style={{background:"#f8fafc",borderRadius:9,padding:"11px 13px",border:"1px solid #e2e8f0"}}>
//                     <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
//                       <p style={{fontSize:12,fontWeight:600,color:"#1e293b",flex:1,marginRight:8}}>
//                         {item.itemName || item.name || item.description || "—"}
//                       </p>
//                       {item.itemStatus && (
//                         <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"#eff6ff",color:"#3b82f6",fontWeight:500,flexShrink:0}}>
//                           {item.itemStatus}
//                         </span>
//                       )}
//                     </div>
//                     <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
//                       {[
//                         /* ✅ FIXED: Multiple fallback field names for Firebase */
//                         ["Part No",
//                           item.partNo       ||
//                           item.part_no      ||
//                           item.partNumber   ||
//                           item.part_number  ||
//                           item.PartNo       ||
//                           item.PARTNO       ||
//                           item.productCode
//                         ],
//                         ["Ordered",
//                           item.orderedQty   ||
//                           item.ordered      ||
//                           item.orderQty     ||
//                           item.OrderedQty
//                         ],
//                         ["Received",
//                           item.okQty        ||
//                           item.receivedQty  ||
//                           item.received     ||
//                           item.receivedQuantity ||
//                           item.ReceivedQty  ||
//                           item.ok_qty       ||
//                           item.totalReceivedQty
//                         ],
//                         ["Pending",
//                           item.pendingQty   ||
//                           item.pending      ||
//                           item.pendingQuantity ||
//                           item.balance      ||
//                           item.PendingQty   ||
//                           item.pending_qty  ||
//                           item.shortage
//                         ],
//                         ["Quantity",
//                           item.quantity     ||
//                           item.qty          ||
//                           item.Quantity
//                         ],
//                         ["Unit Price",
//                           item.unitPrice    ? fmtAmount(item.unitPrice)  :
//                           item.unit_price   ? fmtAmount(item.unit_price) :
//                           item.price        ? fmtAmount(item.price)      :
//                           item.rate         ? fmtAmount(item.rate)       :
//                           undefined
//                         ],
//                       ].map(([l,v])=>(
//                         <div key={l}>
//                           <p style={{fontSize:9.5,color:"#94a3b8",marginBottom:1}}>{l}</p>
//                           <p style={{fontSize:11.5,color:"#1e293b",fontWeight:500}}>{v||"—"}</p>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </>
//           )}

//           {/* Record Info */}
//           <SectionHead title="Record Info"/>
//           <InfoRow label="Document ID" value={inv.id} mono/>
//           <InfoRow label="Created At"  value={fmtTs(inv.createdAt)}/>
//         </div>

//         {/* Sticky Footer */}
//         <div style={{
//           padding:"12px 22px",
//           borderTop:"1px solid #f1f5f9",
//           background:"#fff",
//           display:"flex", gap:8, justifyContent:"flex-end",
//           borderRadius:"0 0 16px 16px",
//           position:"sticky", bottom:0,
//         }}>
//           <button onClick={onClose} style={{height:34,padding:"0 16px",border:"1px solid #e2e8f0",borderRadius:7,fontSize:12,color:"#64748b",background:"#fff",cursor:"pointer"}}>
//             Close
//           </button>
//           <button style={{height:34,padding:"0 16px",border:"none",borderRadius:7,fontSize:12,color:"#fff",background:"#3b82f6",cursor:"pointer",fontWeight:500}}>
//             ↓ Download PDF
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ── Main Page ── */
// export default function VendorInvoiceHistory(){
//   const [invoices,     setInvoices]     = useState([]);
//   const [loading,      setLoading]      = useState(true);
//   const [error,        setError]        = useState(null);
//   const [search,       setSearch]       = useState("");
//   const [statusFilter, setStatusFilter] = useState("All");
//   const [selA,         setSelA]         = useState(null);
//   const [selB,         setSelB]         = useState(null);
//   const [calOpen,      setCalOpen]      = useState(false);
//   const [selected,     setSelected]     = useState(null);

//   useEffect(()=>{
//     async function fetch(){
//       try{
//         setLoading(true);
//         const q=query(collection(db,COLLECTION_NAME),orderBy("invoiceDate","desc"));
//         const snap=await getDocs(q);
//         setInvoices(snap.docs.map(mapDoc));
//       }catch(err){
//         console.error(err);
//         setError("Could not load invoices. "+err.message);
//       }finally{ setLoading(false); }
//     }
//     fetch();
//   },[]);

//   const lo=selA&&selB?(selA<selB?selA:selB):selA;
//   const hi=selA&&selB?(selA<selB?selB:selA):selA;

//   function handleDayClick(a,b){
//     if(a===null){setSelA(null);setSelB(null);return;}
//     if(b!==undefined){setSelA(a);setSelB(b);return;}
//     if(!selA){setSelA(a);setSelB(null);}
//     else if(!selB){if(a===selA)setSelA(null);else{setSelB(a);setCalOpen(false);}}
//     else{setSelA(a);setSelB(null);}
//   }
//   function clearDates(){setSelA(null);setSelB(null);}
//   function clearAll(){setSearch("");setStatusFilter("All");clearDates();}

//   const rangeLabel=lo&&hi&&lo!==hi?`${fmtDate(lo)} – ${fmtDate(hi)}`:selA?fmtDate(selA):"Date range";
//   const statusOptions=useMemo(()=>["All",...Array.from(new Set(invoices.map(r=>r.status).filter(s=>s&&s!=="—")))]
//   ,[invoices]);

//   const filtered=useMemo(()=>invoices.filter(r=>{
//     const q=search.toLowerCase();
//     const ms=r.invoiceNo?.toLowerCase().includes(q)||r.vendor?.toLowerCase().includes(q)||r.po?.toLowerCase().includes(q);
//     const mst=statusFilter==="All"||r.status===statusFilter;
//     const ds=r.date?.slice(0,10)||"";
//     return ms&&mst&&(!lo||ds>=lo)&&(!hi||ds<=hi);
//   }),[invoices,search,statusFilter,selA,selB]);

//   const totalAmount  = invoices.reduce((s,r)=>s+r.amount,0);
//   const paidAmount   = invoices.filter(r=>r.status==="Paid").reduce((s,r)=>s+r.amount,0);
//   const paidCount    = invoices.filter(r=>r.status==="Paid").length;
//   const pendingCount = invoices.filter(r=>r.status==="Unpaid").length;

//   return(
//     <div onClick={()=>setCalOpen(false)} style={{padding:"22px 26px",background:"#f0f4fb",minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

//       {/* Header */}
//       <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
//         <div>
//           <h1 style={{fontSize:18,fontWeight:600,color:"#1e293b"}}>Vendor Invoice History</h1>
//           <p style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Sales Operations · Inward</p>
//         </div>
//         <button style={{display:"flex",alignItems:"center",gap:5,height:32,padding:"0 13px",background:"#3b82f6",border:"none",borderRadius:7,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:500}}>
//           ↓ Export
//         </button>
//       </div>

//       {/* Cards */}
//       <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:14}}>
//         <div style={{background:"#eff6ff",borderRadius:10,padding:"13px 15px",border:"1px solid #bfdbfe"}}>
//           <p style={{fontSize:10,color:"#3b82f6",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>Total Invoices</p>
//           <p style={{fontSize:21,fontWeight:700,color:"#1e40af"}}>{loading?"—":invoices.length}</p>
//           <p style={{fontSize:10,color:"#93c5fd",marginTop:3}}>All vendors</p>
//         </div>
//         <div style={{background:"#f5f3ff",borderRadius:10,padding:"13px 15px",border:"1px solid #ddd6fe"}}>
//           <p style={{fontSize:10,color:"#8b5cf6",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>Total Amount</p>
//           <p style={{fontSize:21,fontWeight:700,color:"#6d28d9"}}>{loading?"—":fmtAmount(totalAmount)}</p>
//           <p style={{fontSize:10,color:"#c4b5fd",marginTop:3}}>Incl. GST</p>
//         </div>
//         <div style={{background:"#f0fdf4",borderRadius:10,padding:"13px 15px",border:"1px solid #86efac"}}>
//           <p style={{fontSize:10,color:"#22c55e",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>Paid</p>
//           <p style={{fontSize:21,fontWeight:700,color:"#15803d"}}>{loading?"—":fmtAmount(paidAmount)}</p>
//           <p style={{fontSize:10,color:"#86efac",marginTop:3}}>{paidCount} invoices</p>
//         </div>
//         <div style={{background:"#fff7ed",borderRadius:10,padding:"13px 15px",border:"1px solid #fed7aa"}}>
//           <p style={{fontSize:10,color:"#f97316",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>Pending</p>
//           <p style={{fontSize:21,fontWeight:700,color:"#c2410c"}}>{loading?"—":pendingCount}</p>
//           <p style={{fontSize:10,color:"#fdba74",marginTop:3}}>Unpaid invoices</p>
//         </div>
//       </div>

//       {/* Filter Bar */}
//       <div style={{background:"#fff",borderRadius:10,border:"1px solid #e2e8f0",padding:"8px 12px",marginBottom:13,display:"flex",gap:7,alignItems:"center"}}>
//         <div style={{position:"relative",width:155,flexShrink:0}}>
//           <svg style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}} width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
//           <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
//             style={{width:"100%",paddingLeft:22,height:28,border:"1px solid #e2e8f0",borderRadius:6,fontSize:12,color:"#1e293b",background:"#f8fafc",outline:"none"}}/>
//         </div>
//         <Divider/>
//         <div style={{position:"relative",flexShrink:0}} onClick={e=>e.stopPropagation()}>
//           <div onClick={()=>setCalOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,height:28,padding:"0 9px",border:"1px solid #e2e8f0",borderRadius:6,background:"#f8fafc",cursor:"pointer",fontSize:11.5,whiteSpace:"nowrap"}}>
//             <svg width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
//             <span style={{color:selA?"#1e293b":"#94a3b8"}}>{rangeLabel}</span>
//             {selA&&<span onClick={e=>{e.stopPropagation();clearDates();}} style={{color:"#94a3b8",fontSize:13,cursor:"pointer"}}>✕</span>}
//           </div>
//           {calOpen&&<Calendar selA={selA} selB={selB} onDayClick={handleDayClick} onClose={()=>setCalOpen(false)}/>}
//         </div>
//         <Divider/>
//         <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
//           style={{height:28,border:"1px solid #e2e8f0",borderRadius:6,padding:"0 6px",fontSize:11.5,color:"#1e293b",background:"#f8fafc",outline:"none",flexShrink:0,cursor:"pointer"}}>
//           {statusOptions.map(s=><option key={s} value={s}>{s==="All"?"All Status":s}</option>)}
//         </select>
//         <Divider/>
//         <button onClick={clearAll} style={{height:28,padding:"0 10px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11.5,color:"#94a3b8",background:"#fff",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
//           Clear All
//         </button>
//       </div>

//       {/* Table */}
//       <div style={{background:"#fff",borderRadius:10,border:"1px solid #e2e8f0",overflow:"hidden"}}>
//         <div style={{overflowX:"auto"}}>
//           <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
//             <thead>
//               <tr style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
//                 {[{l:"Invoice No.",a:"left"},{l:"Vendor Name",a:"left"},{l:"Date",a:"left"},{l:"PO No.",a:"left"},{l:"Amount",a:"right"},{l:"Status",a:"left"},{l:"Action",a:"left"}].map(({l,a})=>(
//                   <th key={l} style={{padding:"9px 13px",textAlign:a,fontSize:10,fontWeight:600,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{l}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {loading?(
//                 <tr><td colSpan={7} style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:12}}>
//                   <div style={{display:"inline-block",width:18,height:18,border:"2px solid #e2e8f0",borderTopColor:"#3b82f6",borderRadius:"50%",animation:"spin 0.7s linear infinite",verticalAlign:"middle"}}/>
//                   <span style={{marginLeft:10}}>Loading invoices...</span>
//                 </td></tr>
//               ):error?(
//                 <tr><td colSpan={7} style={{padding:32,textAlign:"center",color:"#ef4444",fontSize:12}}>⚠️ {error}</td></tr>
//               ):filtered.length===0?(
//                 <tr><td colSpan={7} style={{padding:32,textAlign:"center",color:"#94a3b8",fontSize:12}}>No invoices found</td></tr>
//               ):filtered.map((r,i)=>(
//                 <tr key={r.id} style={{borderBottom:i<filtered.length-1?"1px solid #f1f5f9":"none"}}
//                   onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
//                   onMouseLeave={e=>e.currentTarget.style.background=""}>
//                   <td style={{padding:"10px 13px",color:"#3b82f6",fontWeight:500}}>{r.invoiceNo}</td>
//                   <td style={{padding:"10px 13px",color:"#1e293b",fontWeight:500}}>{r.vendor}</td>
//                   <td style={{padding:"10px 13px",color:"#64748b"}}>{fmtDate(r.date)}</td>
//                   <td style={{padding:"10px 13px",color:"#64748b"}}>{r.po}</td>
//                   <td style={{padding:"10px 13px",color:"#1e293b",fontWeight:600,textAlign:"right"}}>{r.amount?fmtAmount(r.amount):"—"}</td>
//                   <td style={{padding:"10px 13px"}}><StatusBadge status={r.status}/></td>
//                   <td style={{padding:"10px 13px"}}>
//                     <button
//                       onClick={()=>setSelected(r)}
//                       style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",fontSize:11,color:"#3b82f6",cursor:"pointer",fontWeight:500}}>
//                       View
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         {!loading&&!error&&(
//           <div style={{padding:"9px 13px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
//             <p style={{fontSize:11,color:"#94a3b8"}}>Showing {filtered.length} of {invoices.length} invoices</p>
//             <p style={{fontSize:11,color:"#1e293b",fontWeight:600}}>Total: {fmtAmount(filtered.reduce((s,r)=>s+r.amount,0))}</p>
//           </div>
//         )}
//       </div>

//       {/* Detail Modal */}
//       {selected && <InvoiceDetailModal inv={selected} onClose={()=>setSelected(null)}/>}

//       <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
//     </div>
//   );
// }

import { useState, useMemo, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

const COLLECTION_NAME = "excelupload";

function mapDoc(doc) {
  const d = doc.data();
  const rawStatus = d.poStatus || d.status || "";
  const statusMap = {
    paid: "Paid", full: "Paid",
    partial: "Partially Paid", "partially paid": "Partially Paid",
    unpaid: "Unpaid", pending: "Unpaid", "": "—",
  };
  const status = statusMap[rawStatus.toLowerCase()] ?? rawStatus;

  let amount = 0;
  if (Array.isArray(d.items)) {
    amount = d.items.reduce((s, it) => {
      const qty   = Number(it.totalReceivedQty || it.quantity || 0);
      const price = Number(it.unitPrice || it.price || it.rate || 0);
      return s + qty * price;
    }, 0);
  }
  if (!amount) amount = Number(d.totalAmount || d.amount || 0);

  return {
    id:                doc.id,
    invoiceNo:         d.invoiceNo || d.invoiceHeader?.invoiceNo || "—",
    vendor:            d.vendor    || d.invoiceHeader?.supplier  || "—",
    date:              d.invoiceDate || "",
    po:                d.linkedPoNo  || "—",
    amount,
    status,
    rawStatus,
    items:             Array.isArray(d.items) ? d.items : [],
    invoiceHeader:     d.invoiceHeader     || {},
    qualityCheck:      d.qualityCheck      || "—",
    storeQcStatus:     d.storeQcStatus     || "—",
    storeQcApprovedBy: d.storeQcApprovedBy || "—",
    storeQcApprovedAt: d.storeQcApprovedAt || null,
    remarks:           d.remarks           || "",
    linkedPoId:        d.linkedPoId        || "",
    createdAt:         d.createdAt         || null,
  };
}

/* ── CSV Export ── */
function exportToCSV(invoices) {
  const rows = [
    ["Invoice No", "Vendor", "Date", "PO Number", "Amount", "Status"],
    ...invoices.map(r => [
      r.invoiceNo, r.vendor, r.date, r.po,
      r.amount, r.status,
    ]),
  ];
  const csv = rows.map(r =>
    r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `vendor-invoices-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STATUS_STYLE = {
  "Paid":           { bg:"#dcfce7", color:"#166534", dot:"#22c55e" },
  "Unpaid":         { bg:"#fee2e2", color:"#991b1b", dot:"#ef4444" },
  "Partially Paid": { bg:"#fef9c3", color:"#854d0e", dot:"#eab308" },
};
const DEFAULT_SS = { bg:"#f1f5f9", color:"#475569", dot:"#94a3b8" };

function toDs(y,m,d){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function parseDs(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function fmtAmount(n){ return "₹"+Number(n).toLocaleString("en-IN"); }
function fmtDate(s){
  if(!s) return "—";
  try{ return parseDs(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
  catch{ return s; }
}
function fmtTs(ts){
  if(!ts) return "—";
  try{
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
      +" "+d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  } catch{ return "—"; }
}

function StatusBadge({ status }){
  const s = STATUS_STYLE[status] || DEFAULT_SS;
  return (
    <span className="vih-badge" style={{background:s.bg,color:s.color}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
      {status}
    </span>
  );
}

const Divider = () => <div className="vih-divider"/>;

/* ── Calendar ── */
function Calendar({ selA, selB, onDayClick, onClose }){
  const today=new Date(), todayStr=toDs(today.getFullYear(),today.getMonth(),today.getDate());
  const [viewY,setViewY]=useState(selA?parseInt(selA.split("-")[0]):today.getFullYear());
  const [viewM,setViewM]=useState(selA?parseInt(selA.split("-")[1])-1:today.getMonth());
  const lo=selA&&selB?(selA<selB?selA:selB):selA;
  const hi=selA&&selB?(selA<selB?selB:selA):selA;
  function chMon(d){ let m=viewM+d,y=viewY; if(m>11){m=0;y++;}if(m<0){m=11;y--;} setViewM(m);setViewY(y); }
  function applyPreset(days){ const now=new Date(),s=new Date(now);s.setDate(s.getDate()-days); onDayClick(toDs(s.getFullYear(),s.getMonth(),s.getDate()),toDs(now.getFullYear(),now.getMonth(),now.getDate())); onClose(); }
  function applyThisMonth(){ const n=new Date(),last=new Date(n.getFullYear(),n.getMonth()+1,0).getDate(); onDayClick(toDs(n.getFullYear(),n.getMonth(),1),toDs(n.getFullYear(),n.getMonth(),last)); onClose(); }
  const firstDay=new Date(viewY,viewM,1).getDay(), dim=new Date(viewY,viewM+1,0).getDate(), prev=new Date(viewY,viewM,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++){const d=prev-firstDay+1+i;cells.push({d,s:toDs(viewY,viewM-1,d),other:true});}
  for(let d=1;d<=dim;d++) cells.push({d,s:toDs(viewY,viewM,d),other:false,today:toDs(viewY,viewM,d)===todayStr});
  for(let d=1;d<=42-cells.length;d++) cells.push({d,s:toDs(viewY,viewM+1,d),other:true});
  return (
    <div onClick={e=>e.stopPropagation()} className="vih-cal">
      <div className="vih-cal-head">
        <button className="vih-nav-btn" onClick={()=>chMon(-1)}>&#8249;</button>
        <div style={{display:"flex",gap:4}}>
          <select className="vih-sel" value={viewM} onChange={e=>setViewM(+e.target.value)}>{MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
          <select className="vih-sel" value={viewY} onChange={e=>setViewY(+e.target.value)}>{Array.from({length:8},(_,i)=>2020+i).map(y=><option key={y}>{y}</option>)}</select>
        </div>
        <button className="vih-nav-btn" onClick={()=>chMon(1)}>&#8250;</button>
      </div>
      <div className="vih-cal-dow">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d}>{d}</div>)}
      </div>
      <div className="vih-cal-grid">
        {cells.map((c,idx)=>{
          const col=idx%7,isStart=lo&&c.s===lo,isEnd=hi&&c.s===hi,isMid=lo&&hi&&c.s>lo&&c.s<hi;
          const isDot=!c.other&&(isStart||isEnd||(!selB&&selA&&c.s===selA));
          let bgStyle={};
          if(!c.other){
            if(isMid) bgStyle={background:"#dbeafe",borderRadius:col===0?"50% 0 0 50%":col===6?"0 50% 50% 0":0};
            else if(isStart&&hi&&lo!==hi) bgStyle={background:"linear-gradient(to right,transparent 50%,#dbeafe 50%)"};
            else if(isEnd&&lo&&lo!==hi)   bgStyle={background:"linear-gradient(to left,transparent 50%,#dbeafe 50%)"};
          }
          return(
            <div key={idx} onClick={()=>!c.other&&onDayClick(c.s)} className="vih-cal-cell" style={{cursor:c.other?"default":"pointer"}}>
              <div style={{position:"absolute",inset:0,...bgStyle}}/>
              <div className="vih-cal-day" style={{
                background:isDot?"#3b82f6":"transparent",
                color:c.other?"#c8d0dc":isDot?"#fff":c.today?"#3b82f6":"#1e293b",
                fontWeight:c.today?700:400,
              }}>{c.d}</div>
            </div>
          );
        })}
      </div>
      <div className="vih-cal-presets">
        <button className="vih-preset-btn" onClick={()=>applyPreset(6)}>Last 7d</button>
        <button className="vih-preset-btn" onClick={()=>applyPreset(29)}>Last 30d</button>
        <button className="vih-preset-btn" onClick={()=>applyPreset(89)}>Last 3m</button>
        <button className="vih-preset-btn" onClick={applyThisMonth}>This month</button>
        <button onClick={()=>{onDayClick(null,null);onClose();}} className="vih-preset-btn vih-preset-clear">Clear</button>
      </div>
    </div>
  );
}

/* ── Item Card with Damage + Replacement ── */
function ItemCard({ item }) {
  const hasDamage      = item.issue === "damage" || Number(item.damagedQty) > 0;
  const hasReplacement = item.matchedFromInvoice === true || Number(item.newReceived) > Number(item.totalReceivedQty);
  const replacedQty    = hasDamage && hasReplacement ? Number(item.damagedQty || item.shortage || 0) : 0;

  return (
    <div className="vih-item-card">
      {/* Title row */}
      <div className="vih-item-top">
        <p className="vih-item-name">
          {item.description || item.itemName || item.name || "—"}
        </p>
        {item.itemStatus && (
          <span className="vih-item-status-badge">{item.itemStatus}</span>
        )}
      </div>

      {/* Main fields grid */}
      <div className="vih-item-grid">
        {[
          ["Part No",    item.productCode],
          ["Ordered",    item.orderedQty],
          ["Received",   item.totalReceivedQty],
          ["Pending",    item.shortage],
          ["Quantity",   item.quantity],
          ["Unit Price", item.unitPrice ? fmtAmount(item.unitPrice)
                       : item.price    ? fmtAmount(item.price)
                       : item.rate     ? fmtAmount(item.rate)
                       : undefined],
        ].map(([l,v])=>(
          <div key={l} className="vih-item-field">
            <p className="vih-item-field-label">{l}</p>
            <p className="vih-item-field-value">{v ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* ── Damage Section ── */}
      {hasDamage && (
        <div className="vih-damage-block">
          {/* Damage row */}
          <div className="vih-damage-row">
            <span className="vih-damage-dot"/>
            <div className="vih-damage-info">
              <span className="vih-damage-badge">
                ⚠ Damaged: {item.damagedQty || item.shortage} units
              </span>
              {item.issueDetail && (
                <span className="vih-damage-detail">{item.issueDetail}</span>
              )}
            </div>
          </div>

          {/* Replacement row */}
          {hasReplacement && (
            <div className="vih-replace-row">
              <span className="vih-replace-dot"/>
              <div className="vih-replace-info">
                <span className="vih-replace-badge">
                  ✓ Replacement: +{replacedQty} units received
                </span>
                <span className="vih-replace-detail">
                  Issue resolved · Now fully fulfilled
                </span>
              </div>
            </div>
          )}

          {/* Final total if replaced */}
          {hasReplacement && (
            <div className="vih-replace-total">
              <span>Total Received after replacement</span>
              <strong>{Number(item.totalReceivedQty||0) + replacedQty} / {item.orderedQty}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Detail Modal (Centered) ── */
function InvoiceDetailModal({ inv, onClose }){
  const printRef = useRef();
  if(!inv) return null;
  const h = inv.invoiceHeader || {};

  const qcColors = {
    passed:               { bg:"#dcfce7", color:"#166534" },
    passed_with_issues:   { bg:"#fef9c3", color:"#854d0e" },
    failed:               { bg:"#fee2e2", color:"#991b1b" },
    approved_with_issues: { bg:"#fef9c3", color:"#854d0e" },
  };
  const qcStyle = qcColors[inv.qualityCheck]  || { bg:"#f1f5f9", color:"#475569" };
  const sqStyle = qcColors[inv.storeQcStatus] || { bg:"#f1f5f9", color:"#475569" };

  /* ── PDF Print ── */
  function handleDownloadPDF() {
    const content = printRef.current;
    const printWindow = window.open("", `Invoice_${inv.invoiceNo}`, "width=800,height=900");
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${inv.invoiceNo}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
            h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
            .sub { font-size: 11px; color: #64748b; margin-bottom: 16px; }
            .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:600; }
            .section { font-size:9px; font-weight:700; color:#3b82f6; text-transform:uppercase; letter-spacing:.06em; margin:14px 0 6px; }
            .row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f1f5f9; font-size:11px; }
            .row .lbl { color:#94a3b8; }
            .row .val { font-weight:500; text-align:right; }
            .item { background:#f8fafc; border-radius:8px; padding:10px 12px; margin-bottom:8px; border:1px solid #e2e8f0; }
            .item-name { font-size:12px; font-weight:600; margin-bottom:6px; }
            .grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
            .fl { font-size:9px; color:#94a3b8; }
            .fv { font-size:11px; font-weight:500; }
            .dmg { margin-top:8px; padding:8px 10px; background:#fff7ed; border-radius:6px; border-left:3px solid #f97316; }
            .rep { margin-top:6px; padding:8px 10px; background:#f0fdf4; border-radius:6px; border-left:3px solid #22c55e; }
            .qc-row { display:flex; gap:8px; margin:6px 0 4px; }
            .qc-badge { padding:3px 10px; border-radius:20px; font-size:10px; font-weight:500; }
            @media print { body { padding:12px; } }
          </style>
        </head>
        <body>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div>
              <h1>${inv.invoiceNo}</h1>
              <div class="sub">${inv.vendor}</div>
            </div>
            <span class="badge" style="background:${STATUS_STYLE[inv.status]?.bg||"#f1f5f9"};color:${STATUS_STYLE[inv.status]?.color||"#475569"}">${inv.status}</span>
          </div>

          <div class="section">Invoice Information</div>
          <div class="row"><span class="lbl">Invoice No.</span><span class="val">${inv.invoiceNo}</span></div>
          <div class="row"><span class="lbl">Invoice Date</span><span class="val">${fmtDate(inv.date)}</span></div>
          <div class="row"><span class="lbl">Vendor</span><span class="val">${inv.vendor}</span></div>
          <div class="row"><span class="lbl">PO Number</span><span class="val">${inv.po}</span></div>
          <div class="row"><span class="lbl">Consignee</span><span class="val">${h.consignee||"—"}</span></div>
          <div class="row"><span class="lbl">GSTIN</span><span class="val">${h.gstin||"—"}</span></div>
          <div class="row"><span class="lbl">Dated</span><span class="val">${h.dated||"—"}</span></div>
          <div class="row"><span class="lbl">Remarks</span><span class="val">${inv.remarks||"—"}</span></div>

          <div class="section">Quality Check</div>
          <div class="qc-row">
            <span class="qc-badge" style="background:${qcStyle.bg};color:${qcStyle.color}">QC: ${(inv.qualityCheck||"—").replace(/_/g," ")}</span>
            <span class="qc-badge" style="background:${sqStyle.bg};color:${sqStyle.color}">Store: ${(inv.storeQcStatus||"—").replace(/_/g," ")}</span>
          </div>
          <div class="row"><span class="lbl">Approved By</span><span class="val">${inv.storeQcApprovedBy||"—"}</span></div>
          <div class="row"><span class="lbl">Approved At</span><span class="val">${fmtTs(inv.storeQcApprovedAt)}</span></div>

          ${inv.items.length > 0 ? `
          <div class="section">Items (${inv.items.length})</div>
          ${inv.items.map(item => {
            const hasDmg = item.issue === "damage" || Number(item.damagedQty) > 0;
            const hasRep = item.matchedFromInvoice === true || Number(item.newReceived) > Number(item.totalReceivedQty);
            const repQty = hasDmg && hasRep ? Number(item.damagedQty || item.shortage || 0) : 0;
            return `
            <div class="item">
              <div class="item-name">${item.description||item.itemName||item.name||"—"}
                ${item.itemStatus ? `<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:#eff6ff;color:#3b82f6;font-weight:500;margin-left:8px">${item.itemStatus}</span>` : ""}
              </div>
              <div class="grid">
                <div><div class="fl">Part No</div><div class="fv">${item.productCode||"—"}</div></div>
                <div><div class="fl">Ordered</div><div class="fv">${item.orderedQty||"—"}</div></div>
                <div><div class="fl">Received</div><div class="fv">${item.totalReceivedQty||"—"}</div></div>
                <div><div class="fl">Pending</div><div class="fv">${item.shortage||"—"}</div></div>
                <div><div class="fl">Quantity</div><div class="fv">${item.quantity||"—"}</div></div>
                <div><div class="fl">Unit Price</div><div class="fv">${item.unitPrice?fmtAmount(item.unitPrice):item.price?fmtAmount(item.price):"—"}</div></div>
              </div>
              ${hasDmg ? `
                <div class="dmg">
                  <strong>⚠ Damaged: ${item.damagedQty||item.shortage} units</strong>
                  ${item.issueDetail ? `<div style="font-size:10px;color:#92400e;margin-top:2px">${item.issueDetail}</div>` : ""}
                </div>
              ` : ""}
              ${hasRep ? `
                <div class="rep">
                  <strong>✓ Replacement: +${repQty} units received</strong>
                  <div style="font-size:10px;color:#166534;margin-top:2px">Issue resolved · Total: ${Number(item.totalReceivedQty||0)+repQty} / ${item.orderedQty}</div>
                </div>
              ` : ""}
            </div>`;
          }).join("")}
          ` : ""}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  }

  function InfoRow({ label, value, mono }){
    return(
      <div className="vih-info-row">
        <span className="vih-info-label">{label}</span>
        <span className="vih-info-value" style={{fontFamily:mono?"monospace":"inherit"}}>{value||"—"}</span>
      </div>
    );
  }
  function SectionHead({ title }){
    return <p className="vih-section-head">{title}</p>;
  }

  return(
    <div onClick={onClose} className="vih-overlay">
      <div onClick={e=>e.stopPropagation()} className="vih-modal" ref={printRef}>

        {/* Header */}
        <div className="vih-modal-header">
          <div>
            <p className="vih-modal-label">Invoice Detail</p>
            <h2 className="vih-modal-title">{inv.invoiceNo}</h2>
            <p className="vih-modal-vendor">{inv.vendor}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <StatusBadge status={inv.status}/>
            <button onClick={onClose} className="vih-close-btn">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="vih-modal-body">
          <SectionHead title="Invoice Information"/>
          <InfoRow label="Invoice No."  value={inv.invoiceNo}/>
          <InfoRow label="Invoice Date" value={fmtDate(inv.date)}/>
          <InfoRow label="Vendor"       value={inv.vendor}/>
          <InfoRow label="PO Number"    value={inv.po}/>
          <InfoRow label="Consignee"    value={h.consignee}/>
          <InfoRow label="GSTIN"        value={h.gstin} mono/>
          <InfoRow label="Dated"        value={h.dated}/>
          <InfoRow label="Remarks"      value={inv.remarks||"—"}/>

          <SectionHead title="Quality Check"/>
          <div className="vih-qc-badges">
            <span className="vih-qc-badge" style={{background:qcStyle.bg,color:qcStyle.color}}>
              QC: {inv.qualityCheck?.replace(/_/g," ")||"—"}
            </span>
            <span className="vih-qc-badge" style={{background:sqStyle.bg,color:sqStyle.color}}>
              Store: {inv.storeQcStatus?.replace(/_/g," ")||"—"}
            </span>
          </div>
          <InfoRow label="Approved By" value={inv.storeQcApprovedBy}/>
          <InfoRow label="Approved At" value={fmtTs(inv.storeQcApprovedAt)}/>

          {/* Items */}
          {inv.items.length > 0 && (
            <>
              <SectionHead title={`Items (${inv.items.length})`}/>
              <div className="vih-items-list">
                {inv.items.map((item,i) => <ItemCard key={i} item={item}/>)}
              </div>
            </>
          )}

          <SectionHead title="Record Info"/>
          <InfoRow label="Document ID" value={inv.id} mono/>
          <InfoRow label="Created At"  value={fmtTs(inv.createdAt)}/>
        </div>

        {/* Footer */}
        <div className="vih-modal-footer">
          <button onClick={onClose} className="vih-btn-close">Close</button>
          <button onClick={handleDownloadPDF} className="vih-btn-pdf">↓ Download PDF</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function VendorInvoiceHistory(){
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selA,         setSelA]         = useState(null);
  const [selB,         setSelB]         = useState(null);
  const [calOpen,      setCalOpen]      = useState(false);
  const [selected,     setSelected]     = useState(null);

  useEffect(()=>{
    async function fetchData(){
      try{
        setLoading(true);
        const q=query(collection(db,COLLECTION_NAME),orderBy("invoiceDate","desc"));
        const snap=await getDocs(q);
        const filteredDocs = snap.docs.filter(doc => {
          const t = (doc.data().type || "").toUpperCase();
          return t === "INVOICE";
        });
        setInvoices(filteredDocs.map(mapDoc));
      }catch(err){
        console.error(err);
        setError("Could not load invoices. "+err.message);
      }finally{ setLoading(false); }
    }
    fetchData();
  },[]);

  const lo=selA&&selB?(selA<selB?selA:selB):selA;
  const hi=selA&&selB?(selA<selB?selB:selA):selA;

  function handleDayClick(a,b){
    if(a===null){setSelA(null);setSelB(null);return;}
    if(b!==undefined){setSelA(a);setSelB(b);return;}
    if(!selA){setSelA(a);setSelB(null);}
    else if(!selB){if(a===selA)setSelA(null);else{setSelB(a);setCalOpen(false);}}
    else{setSelA(a);setSelB(null);}
  }
  function clearDates(){setSelA(null);setSelB(null);}
  function clearAll(){setSearch("");setStatusFilter("All");clearDates();}

  const rangeLabel=lo&&hi&&lo!==hi?`${fmtDate(lo)} – ${fmtDate(hi)}`:selA?fmtDate(selA):"Date range";
  const statusOptions=useMemo(()=>["All",...Array.from(new Set(invoices.map(r=>r.status).filter(s=>s&&s!=="—")))]
  ,[invoices]);

  const filtered=useMemo(()=>invoices.filter(r=>{
    const q=search.toLowerCase();
    const ms=r.invoiceNo?.toLowerCase().includes(q)||r.vendor?.toLowerCase().includes(q)||r.po?.toLowerCase().includes(q);
    const mst=statusFilter==="All"||r.status===statusFilter;
    const ds=r.date?.slice(0,10)||"";
    return ms&&mst&&(!lo||ds>=lo)&&(!hi||ds<=hi);
  }),[invoices,search,statusFilter,selA,selB]);

  const totalAmount  = invoices.reduce((s,r)=>s+r.amount,0);
  const paidAmount   = invoices.filter(r=>r.status==="Paid").reduce((s,r)=>s+r.amount,0);
  const paidCount    = invoices.filter(r=>r.status==="Paid").length;
  const pendingCount = invoices.filter(r=>r.status==="Unpaid").length;

  return(
    <div onClick={()=>setCalOpen(false)} className="vih-page">

      {/* Header */}
      <div className="vih-page-header">
        <div>
          <h1 className="vih-page-title">Vendor Invoice History</h1>
          <p className="vih-page-sub">Sales Operations · Inward</p>
        </div>
        {/* ✅ Export Button — CSV download */}
        <button
          className="vih-export-btn"
          onClick={() => exportToCSV(filtered)}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Cards */}
      <div className="vih-cards">
        <div className="vih-card vih-card-blue">
          <p className="vih-card-label">Total Invoices</p>
          <p className="vih-card-value">{loading?"—":invoices.length}</p>
          <p className="vih-card-sub">All vendors</p>
        </div>
        <div className="vih-card vih-card-purple">
          <p className="vih-card-label">Total Amount</p>
          <p className="vih-card-value">{loading?"—":fmtAmount(totalAmount)}</p>
          <p className="vih-card-sub">Incl. GST</p>
        </div>
        <div className="vih-card vih-card-green">
          <p className="vih-card-label">Paid</p>
          <p className="vih-card-value">{loading?"—":fmtAmount(paidAmount)}</p>
          <p className="vih-card-sub">{paidCount} invoices</p>
        </div>
        <div className="vih-card vih-card-orange">
          <p className="vih-card-label">Pending</p>
          <p className="vih-card-value">{loading?"—":pendingCount}</p>
          <p className="vih-card-sub">Unpaid invoices</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="vih-filter-bar">
        <div className="vih-search-wrap">
          <svg className="vih-search-icon" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="vih-search"/>
        </div>
        <Divider/>
        <div style={{position:"relative",flexShrink:0}} onClick={e=>e.stopPropagation()}>
          <div onClick={()=>setCalOpen(o=>!o)} className="vih-date-btn">
            <svg width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{color:selA?"#1e293b":"#94a3b8"}}>{rangeLabel}</span>
            {selA&&<span onClick={e=>{e.stopPropagation();clearDates();}} className="vih-date-clear">✕</span>}
          </div>
          {calOpen&&<Calendar selA={selA} selB={selB} onDayClick={handleDayClick} onClose={()=>setCalOpen(false)}/>}
        </div>
        <Divider/>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="vih-status-sel">
          {statusOptions.map(s=><option key={s} value={s}>{s==="All"?"All Status":s}</option>)}
        </select>
        <Divider/>
        <button onClick={clearAll} className="vih-clear-btn">Clear All</button>
      </div>

      {/* Table */}
      <div className="vih-table-wrap">
        <div style={{overflowX:"auto"}}>
          <table className="vih-table">
            <thead>
              <tr>
                {[{l:"Invoice No.",a:"left"},{l:"Vendor Name",a:"left"},{l:"Date",a:"left"},{l:"PO No.",a:"left"},{l:"Amount",a:"right"},{l:"Status",a:"left"},{l:"Action",a:"left"}].map(({l,a})=>(
                  <th key={l} style={{textAlign:a}}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                <tr><td colSpan={7} className="vih-table-msg">
                  <div className="vih-spinner"/>
                  <span style={{marginLeft:10}}>Loading invoices...</span>
                </td></tr>
              ):error?(
                <tr><td colSpan={7} className="vih-table-msg" style={{color:"#ef4444"}}>⚠️ {error}</td></tr>
              ):filtered.length===0?(
                <tr><td colSpan={7} className="vih-table-msg">No invoices found</td></tr>
              ):filtered.map((r,i)=>(
                <tr key={r.id} className="vih-tr">
                  <td className="vih-td-invoice">{r.invoiceNo}</td>
                  <td className="vih-td-bold">{r.vendor}</td>
                  <td className="vih-td-muted">{fmtDate(r.date)}</td>
                  <td className="vih-td-muted">{r.po}</td>
                  <td className="vih-td-amount">{r.amount?fmtAmount(r.amount):"—"}</td>
                  <td><StatusBadge status={r.status}/></td>
                  <td><button onClick={()=>setSelected(r)} className="vih-view-btn">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading&&!error&&(
          <div className="vih-table-footer">
            <p>Showing {filtered.length} of {invoices.length} invoices</p>
            <p className="vih-table-total">Total: {fmtAmount(filtered.reduce((s,r)=>s+r.amount,0))}</p>
          </div>
        )}
      </div>

      {selected && <InvoiceDetailModal inv={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}