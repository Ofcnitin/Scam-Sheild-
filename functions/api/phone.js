export async function onRequest(context){
 const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST,OPTIONS"};
 if(context.request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  const {number}=await context.request.json();
  const raw=String(number||"").trim(),digits=raw.replace(/\D/g,"");
  if(digits.length<8||digits.length>15)throw Error("Invalid phone number format.");
  // Keep this adapter isolated so the provider can be replaced without touching the UI.
  const r=await fetch(`https://calltracer.io/api/lookup/${encodeURIComponent(digits)}`,{headers:{"Accept":"application/json","User-Agent":"ScamShield/1.0"}});
  if(!r.ok)throw Error(`Phone intelligence unavailable (${r.status}).`);
  const lookup=await r.json();
  return new Response(JSON.stringify({number:raw,international:raw,lookup}),{status:200,headers:{"Content-Type":"application/json",...cors}});
 }catch(e){return new Response(JSON.stringify({error:e.message||"Phone lookup failed"}),{status:400,headers:{"Content-Type":"application/json",...cors})}
}
