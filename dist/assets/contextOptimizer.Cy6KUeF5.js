import{customerKnowledgeService as z}from"./customerKnowledgeService.CYI6KU_P.js";import{ap as T,aq as w,_ as O,Z as M}from"./index.BFKGO7T9.js";const f=8e3,S=6e3,u=(r,s)=>{if(r.length<=s)return r;const n=r.split(`

`),e=[];let t=0;for(const o of n)if(t+o.length>s){const a=o.split(/[.!?]\s+/),c=a.slice(0,Math.ceil(a.length*.7)).join(". ")+".";t+c.length<=s&&(e.push(c),t+=c.length);break}else e.push(o),t+=o.length;return e.join(`

`)},A=r=>{const s=Date.now(),n=2160*60*60*1e3;return r.map(e=>{let t=.5;const o=s-e.createdAt,a=Math.max(0,1-o/n);return t+=a*.3,e.confidence!==void 0&&(t+=e.confidence*.2),e.usageCount!==void 0&&e.usageCount>0&&(t+=Math.min(.2,e.usageCount/10)),{text:e.text,score:Math.min(1,t)}}).sort((e,t)=>t.score-e.score)},$=async(r,s=S)=>{try{const n=await w.getFAQEntries(void 0,r);if(n.length===0)return"";let e=n.map(t=>`Q: ${t.question}
R: ${t.answer}`).join(`

`);return e.length>s&&(e=u(e,s)),`

FAQ DISPONÍVEL (Base de Conhecimento):
${e}

Use estas informações quando o usuário fizer perguntas relacionadas.
Seja natural e não cite literalmente, mas use o conhecimento para responder de forma amigável.`}catch(n){return console.error("[contextOptimizer] Erro ao otimizar FAQ context:",n),""}},v=async(r,s,n=2e3)=>{if(!r)return"";try{const e=await z.getCustomerKnowledge(r);if(!e||e.knowledgeEntries.length===0)return"";const t=e.knowledgeEntries.map(i=>{const c=i.tags.find(l=>l.startsWith("confidence_")),p=c?parseInt(c.replace("confidence_",""))/10:void 0;return{text:i.content,createdAt:i.createdAt,confidence:p,usageCount:0}});let a=A(t).slice(0,10).map(i=>i.text).join(`

`);return a.length>n&&(a=u(a,n)),`

CONHECIMENTO ESPECÍFICO DO CLIENTE (${r}):
${a}

Use este conhecimento específico do cliente quando relevante para responder perguntas similares.`}catch(e){return console.error("[contextOptimizer] Erro ao otimizar customer context:",e),""}},q=async(r,s=2e3)=>{try{const n=await O.getKnowledgeBaseEntries({companyId:r,verified:!0});if(n.length===0)return"";let t=n.sort((o,a)=>a.updatedAt-o.updatedAt).slice(0,10).map(o=>{const a=o.tags&&o.tags.length>0?`
Tags: ${o.tags.join(", ")}`:"",i=o.category?`
Categoria: ${o.category}`:"";return`${o.title}${i}${a}
${o.content}`}).join(`

---

`);return t.length>s&&(t=u(t,s)),`

BASE DE CONHECIMENTO (Treinamento da IA):
${t}

Esta é a base de conhecimento geral do sistema, criada e verificada por administradores.
Use estas informações como referência principal para responder perguntas dos usuários.
Sempre priorize este conhecimento sobre outras fontes quando relevante.`}catch(n){return console.error("[contextOptimizer] Erro ao otimizar base de conhecimento:",n),""}},R=async(r,s=1500)=>{if(!r)return"";try{const n=await M.getDefaultResponses(r,!0);if(n.length===0)return"";let t=n.sort((o,a)=>a.usageCount-o.usageCount).slice(0,5).map(o=>`P: ${o.question}
R: ${o.answer}`).join(`

`);return t.length>s&&(t=u(t,s)),`

RESPOSTAS PADRÃO DISPONÍVEIS:
${t}

Use estas respostas padrão quando a pergunta do usuário for semelhante.
Priorize respostas padrão sobre outras fontes quando aplicável.`}catch(n){return console.error("[contextOptimizer] Erro ao otimizar respostas padrão:",n),""}},P=async(r,s,n=[])=>{try{const e=f,t=Math.floor(e*.3),o=Math.floor(e*.2),a=Math.floor(e*.3),i=Math.floor(e*.2),[c,p,l,g]=await Promise.all([$(s,t),v(r,s,o),q(s,a),R(s,i)]),x=[g,l,c,p].filter(h=>h.length>0).join(`
`);let d=x;if(r&&(d=T(x,r,n)),d.length>f){if(g.length>0&&l.length>0){const h=f-g.length-l.length-200,C=[c,p].filter(m=>m.length>0).join(`
`),E=u(C,Math.max(0,h));return[g,l,E].filter(m=>m.length>0).join(`
`)}return u(d,f)}return d}catch(e){return console.error("[contextOptimizer] Erro ao otimizar contexto completo:",e),""}};export{v as optimizeCustomerContext,R as optimizeDefaultResponsesContext,$ as optimizeFAQContext,P as optimizeFullContext,q as optimizeKnowledgeBaseContext};
