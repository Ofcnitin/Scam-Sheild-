const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let mode="message";

const cfg={
 message:{label:"MESSAGE ANALYZER",title:"Paste the message you don't trust.",note:"Runs local pattern analysis first.",placeholder:"Example: Your account will be blocked today. Verify your OTP immediately at https://...",kind:"message"},
 url:{label:"LINK INTELLIGENCE",title:"Paste the link before you open it.",note:"Local URL signals run before external intelligence.",placeholder:"https://example.com/verify",kind:"url"},
 phone:{label:"PHONE INTELLIGENCE",title:"Check an unknown caller.",note:"Number format is checked locally first.",placeholder:"+91 98765 43210",kind:"phone"}
};

function renderInput(){
 const c=cfg[mode];
 $("#modeLabel").textContent=c.label;$("#modeTitle").textContent=c.title;$("#submitNote").textContent=c.note;
 $("#inputWrap").innerHTML=mode==="message"
 ? `<textarea id="scanInput" class="input" maxlength="5000" placeholder="${c.placeholder}"></textarea>`
 : `<input id="scanInput" class="input single" type="${mode==="phone"?"tel":"url"}" autocomplete="off" placeholder="${c.placeholder}">`;
 $("#counter").textContent=mode==="message"?"0 / 5,000":"";
 renderChips();
}
function renderChips(){
 const sets={
  message:[["Urgency","Your account will be closed in 24 hours"],["OTP request","Send your OTP to verify"],["Prize","Congratulations! You won ₹50,000"]],
  url:[["Phishing","https://secure-account-verify.example/login"],["Short link","https://bit.ly/example"]],
  phone:[["India","+91 98765 43210"],["International","+1 202 555 0184"]]
 };
 $("#smartChips").innerHTML=(sets[mode]||[]).map(([n,v])=>`<button class="smart-chip" data-fill="${esc(v)}">${n}</button>`).join("");
}
renderInput();

$$(".scan-tab").forEach(b=>b.addEventListener("click",()=>{
 $$(".scan-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");mode=b.dataset.mode;$("#result").classList.add("hidden");renderInput();
}));
document.addEventListener("input",e=>{
 if(e.target.id==="scanInput"&&mode==="message")$("#counter").textContent=`${e.target.value.length.toLocaleString()} / 5,000`;
});
document.addEventListener("click",e=>{
 const f=e.target.closest("[data-fill]");if(f){$("#scanInput").value=f.dataset.fill;$("#scanInput").dispatchEvent(new Event("input"));$("#scanInput").focus()}
 const j=e.target.closest("[data-jump]");if(j){e.preventDefault();document.querySelector(j.dataset.jump)?.scrollIntoView({behavior:"smooth"})}
});
$("#analyze").addEventListener("click",()=>mode==="message"?messageCheck():mode==="url"?urlCheck():phoneCheck());

const escapeHtml=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const esc=s=>escapeHtml(s);

function messageCheck(){
 const text=$("#scanInput").value.trim();if(!text)return alert("Paste a message first.");
 const t=text.toLowerCase(),rules=[
  [/\b(otp|one[- ]time password|verification code)\b/,"Requests an OTP or verification code.",28],
  [/\b(pin|cvv|cvc|password|passcode)\b/,"Mentions sensitive authentication information such as a PIN, CVV or password.",28],
  [/\b(immediately|urgent|act now|last warning|final notice|within\s+\d+\s*(hour|hours|minute|minutes)|today only)\b/,"Creates urgency or a deadline to pressure you.",20],
  [/\b(block(ed|ing)?|suspend(ed|ing)?|freeze|terminate|legal action|police case)\b/,"Uses a threat involving account suspension, closure or legal consequences.",17],
  [/\b(prize|lottery|winner|won|reward|cashback|refund|gift|lucky draw)\b/,"Promises unexpected money, a prize, reward or refund.",20],
  [/\b(bank|sbi|hdfc|icici|axis|rbi|income tax|customs|police|government|courier|fedex|dhl|amazon|flipkart|paytm|phonepe|google pay|gpay)\b/,"May be impersonating a bank, government body, delivery service or major brand.",12],
  [/\b(click|tap|verify|confirm|update|kyc|reactivate|unlock)\b.{0,90}\b(link|url|account|details|otp)?/,"Pushes you toward an immediate verification or account action.",12],
  [/\b(send|pay|transfer|deposit)\b.{0,90}\b(rs\.?|₹|inr|rupees|upi|account|fee|charge)\b/,"Requests a payment or transfer.",18]
 ];
 let score=0,reasons=[];
 rules.forEach(r=>{if(r[0].test(t)){score+=r[2];reasons.push(r[1])}});
 const urls=text.match(/\bhttps?:\/\/[^\s<>"']+/gi)||[];
 if(urls.length){score+=8;reasons.push(`Contains ${urls.length} URL${urls.length>1?"s":""} that should be checked separately.`)}
 score=Math.min(score,98);
 const verdict=score>=55?"HIGH RISK":score>=25?"CAUTION":"LOW RISK";
 const extra=urls.length?`<div class="detected"><h4>DETECTED LINKS</h4>${urls.map(u=>`<button class="detected-link" data-open-url="${esc(u)}">${esc(u.slice(0,65))} ↗</button>`).join("")}</div>`:"";
 showResult(verdict,score,reasons,extra);
}
function localUrl(raw){
 let u;try{u=new URL(raw)}catch{return {error:"Enter a complete URL such as https://example.com"}}
 if(!["http:","https:"].includes(u.protocol))return {error:"Only HTTP/HTTPS links are supported."};
 const d=u.hostname.toLowerCase();let score=0,reasons=[];
 if(u.protocol==="http:"){score+=8;reasons.push("Uses HTTP instead of HTTPS.")}
 if(/^(\d{1,3}\.){3}\d{1,3}$/.test(d)){score+=28;reasons.push("Uses an IP address instead of a normal domain name.")}
 if(d.includes("xn--")){score+=25;reasons.push("Uses punycode, which can hide lookalike characters.")}
 if(/[^\x00-\x7F]/.test(d)){score+=20;reasons.push("Contains non-ASCII domain characters.")}
 if(d.split(".").length>4){score+=12;reasons.push("Has an unusually deep subdomain structure.")}
 if((u.href.match(/%[0-9a-f]{2}/gi)||[]).length>4){score+=12;reasons.push("Contains substantial URL encoding or obfuscation.")}
 if(/(login|verify|secure|account|wallet|payment|refund|bonus|gift|claim|update|kyc)/i.test(u.pathname+u.search)){score+=7;reasons.push("Uses words commonly found in account or payment lures.")}
 return {url:u.href,domain:d,score:Math.min(score,90),reasons};
}
async function urlCheck(){
 const raw=$("#scanInput").value.trim();if(!raw)return alert("Paste a URL first.");
 const local=localUrl(raw);if(local.error)return showResult("UNVERIFIED",0,[local.error]);
 busy(true);
 try{
  const r=await fetch("/api/url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:local.url})});
  const d=await r.json();let score=local.score,reasons=[...local.reasons];
  if(d.phishtank&&!d.phishtank.error){
   const q=d.phishtank.results||d.phishtank;
   if(q.in_database&&q.valid){score=Math.min(99,score+70);reasons.unshift("PhishTank reports this URL as a verified phishing entry.")}
   else reasons.push("No verified PhishTank match was returned.")
  }else reasons.push("PhishTank was unavailable; the result is based on remaining signals.")
  const ev=d.rdap?.events||[],reg=ev.find(x=>x.eventAction==="registration");
  if(reg){const days=Math.max(0,Math.floor((Date.now()-new Date(reg.eventDate))/86400000));if(days<30){score=Math.min(95,score+20);reasons.push(`Domain registration appears very recent (${days} days).`)}else reasons.push(`Domain registration appears older than ${Math.floor(days/30)} months.`)}
  else reasons.push("Domain registration age could not be verified.")
  if(d.redirects?.finalUrl&&d.redirects.finalUrl!==local.url){score=Math.min(95,score+8);reasons.push(`The link redirects to ${d.redirects.finalUrl}.`)}
  showResult(score>=55?"HIGH RISK":score>=25?"CAUTION":"LOW RISK",score,reasons,`<div class="detected"><h4>DOMAIN</h4><strong>${esc(local.domain)}</strong><p>Public intelligence sources are supplemental; missing data is not proof of safety.</p></div>`);
 }catch(e){showResult(local.score?"CAUTION":"UNVERIFIED",local.score,[...local.reasons,"Live reputation sources could not be reached. This link is therefore not fully verified."],`<div class="detected"><h4>UNVERIFIED</h4><p>No external reputation verdict was available.</p></div>`)}
 finally{busy(false)}
}
async function phoneCheck(){
 const raw=$("#scanInput").value.trim();if(!raw)return alert("Enter a phone number first.");
 const digits=raw.replace(/\D/g,"");
 if(digits.length<8||digits.length>15)return showResult("UNVERIFIED",0,["The number format does not look valid."]);
 busy(true);
 try{
  const r=await fetch("/api/phone",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({number:raw,country:"IN"})});
  const d=await r.json();if(!r.ok)throw Error(d.error||"Lookup failed");
  const q=d.lookup||{},spam=Number(q.reports?.spam_score);
  let score=Number.isFinite(spam)?Math.min(95,spam):0;
  const reasons=[];
  if(Number.isFinite(spam))reasons.push(`Community spam signal: ${spam}/100.`);else reasons.push("No community spam score was available.");
  if(q.reports?.total!=null)reasons.push(`${q.reports.total} community report${q.reports.total===1?"":"s"} were returned.`);
  if(q.carrier)reasons.push(`Carrier: ${q.carrier}.`);
  if(q.number_type)reasons.push(`Line type: ${q.number_type}.`);
  if(q.location)reasons.push(`Location: ${q.location}.`);
  showResult(score>=60?"HIGH RISK":score>=25?"CAUTION":"LOW RISK",score,reasons,`<div class="detected"><h4>NUMBER</h4><strong>${esc(d.international||raw)}</strong><p>Community/carrier information is not verified identity.</p></div>`);
 }catch(e){showResult("UNVERIFIED",0,[e.message,"The lookup service may be unavailable or rate-limited. Try again later."])}
 finally{busy(false)}
}
function busy(on){$("#analyze").disabled=on;$("#analyze").innerHTML=on?"Checking…":"Analyze <span>→</span>"}
function showResult(verdict,score,reasons,extra=""){
 const cls=verdict==="HIGH RISK"?"high":verdict==="CAUTION"?"caution":verdict==="LOW RISK"?"low":"unknown";
 $("#result").innerHTML=`<div class="result-head"><div class="verdict-wrap"><i class="verdict-dot ${cls}"></i><div><h3>${verdict}</h3><div class="verdict-score">Risk signal score · ${score}/100</div></div></div><div class="score-ring ${cls}">${score}</div></div>${extra?`<div class="result-body">${extra}</div>`:""}<div class="result-body"><h4>WHY THIS RESULT</h4><ul>${(reasons.length?reasons:["No strong scam pattern was detected."]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div><div class="result-actions"><a href="#report" class="${verdict==="HIGH RISK"?"danger":""}">What should I do? →</a></div>`;
 $("#result").classList.remove("hidden");$("#result").scrollIntoView({behavior:"smooth",block:"nearest"});
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-open-url]");if(b){e.preventDefault();mode="url";$$(".scan-tab").forEach(x=>x.classList.toggle("active",x.dataset.mode==="url"));renderInput();$("#scanInput").value=b.dataset.openUrl;urlCheck()}
});
