import { spawn } from "node:child_process";
const EDGE="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT=9550, BASE="http://47.112.8.28:3000";
const proc=spawn(EDGE,["--headless=new",`--remote-debugging-port=${PORT}`,"--user-data-dir=C:/Users/AAA/AppData/Local/Temp/zongce-edge-m","--no-first-run","--disable-gpu","--disable-features=msEdgeCopilot","about:blank"]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){for(let i=0;i<40;i++){try{const l=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();const p=l.find(t=>t.type==="page");if(p)return p.webSocketDebuggerUrl;}catch{}await sleep(300);}throw new Error("no");}
const ws=new WebSocket(await wsUrl());let id=0;const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const ev=async x=>(await send("Runtime.evaluate",{expression:x,returnByValue:true,awaitPromise:true})).result?.result?.value;
await new Promise(r=>ws.onopen=r);
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send("Page.navigate",{url:BASE+"/add"});
await sleep(3200);
console.log("录入页高度:", await ev("document.documentElement.scrollHeight"), "px =", ((await ev("document.documentElement.scrollHeight"))/844).toFixed(1), "屏");
console.log("表单控件（输入/下拉/按钮）:", await ev(`[...document.querySelectorAll("main input, main select, main button")].filter(e=>e.offsetParent!==null).length`));
console.log("各字段:", await ev(`[...document.querySelectorAll("main span")].map(s=>s.innerText.trim()).filter(t=>t && t.length<14 && !t.includes("×")).slice(0,14).join(" / ")`));
// 选完规则后的高度
await ev(`(()=>{const i=document.querySelector('input[placeholder="输入关键词"]');const st=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;st.call(i,"志愿");i.dispatchEvent(new Event("input",{bubbles:true}));})()`);
await sleep(700);
await ev(`[...document.querySelectorAll("main button")].find(b=>b.innerText.includes("志愿"))?.click()`);
await sleep(600);
console.log("选完规则后高度:", await ev("document.documentElement.scrollHeight"), "px");
ws.close();proc.kill();process.exit(0);
