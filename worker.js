// =================================================================================
//  項目: ai-generator-2api (Cloudflare Worker 單文件版)
//  版本: 2.16.1 (Hotfix: UI List Repair)
//  作者: 首席AI執行官
//  日期: 2025-11-28
// =================================================================================

const CONFIG = {
  PROJECT_NAME: "ai-generator-multi-model",
  PROJECT_VERSION: "2.16.1",
  API_MASTER_KEY: "1",
  UPSTREAM_ORIGIN: "https://ai-image-generator.co",
  POLLINATIONS_ORIGIN: "https://image.pollinations.ai",
  
  API_PROVIDERS: {
    "pollinations": { name: "Pollinations", icon: "🆓", isFree: true },
    "replicate": { name: "Replicate", icon: "💎", isFree: false }
  },
  DEFAULT_PROVIDER: "pollinations",
  SAFETY_CONFIG: { enableNSFW: true, requireAgeVerification: true, minAge: 18 },
  MODEL_CACHE_TTL: 3600,
  
  STYLE_PRESETS: {
    "auto": { name: "自動", prompt: "" },
    "anime": { name: "日本動漫", prompt: "anime style, vibrant colors, cel shading" },
    "realistic": { name: "寫實照片", prompt: "photorealistic, 8k uhd, dslr quality" },
    "cyberpunk": { name: "賽博朋克", prompt: "cyberpunk style, neon lights, futuristic" },
    "3d-render": { name: "3D渲染", prompt: "3d render, octane render, blender" }
  },
  DEFAULT_STYLE: "auto",
  
  POLLINATIONS_MODELS: {
    "pollinations-flux-pro": { displayName: "Pollinations Flux Pro ⭐", provider: "pollinations", upstreamModel: "flux-pro", credits: 0, isFree: true, category: "professional" },
    "pollinations-flux-1.1-pro": { displayName: "Pollinations Flux 1.1 Pro 🔥", provider: "pollinations", upstreamModel: "flux-1.1-pro", credits: 0, isFree: true, category: "professional" },
    "pollinations-flux-anime": { displayName: "Pollinations Flux Anime", provider: "pollinations", upstreamModel: "flux-anime", credits: 0, isFree: true, category: "specialized" },
    "pollinations-flux-realism": { displayName: "Pollinations Flux Realism", provider: "pollinations", upstreamModel: "flux-realism", credits: 0, isFree: true, category: "professional" },
    "pollinations-turbo": { displayName: "Pollinations Turbo", provider: "pollinations", upstreamModel: "turbo", credits: 0, isFree: true, category: "basic" }
  },
  MAX_IMAGES: 4
};

let CACHED_MODELS = null;

export default {
  async fetch(request, env, ctx) {
    const apiKey = env.API_MASTER_KEY || CONFIG.API_MASTER_KEY;
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
    if (url.pathname === '/age-verify') return handleAgeVerification(request);
    if (url.pathname === '/') return handleUI(request, apiKey);
    if (url.pathname.startsWith('/v1/')) return handleAPI(request, apiKey);
    return new Response('Not Found', { status: 404 });
  }
};

async function handleAPI(request, apiKey) {
    const url = new URL(request.url);
    if (url.pathname === '/v1/models') return new Response(JSON.stringify({ data: Object.values(await getAllModels()) }), { headers: corsHeaders() });
    
    if (url.pathname === '/v1/chat/completions' || url.pathname === '/v1/images/generations') {
        if (!verifyAuth(request, apiKey)) return new Response('Unauthorized', { status: 401 });
        try {
            const body = await request.json();
            const model = body.model || "pollinations-flux-pro";
            const prompt = (body.messages ? body.messages.pop().content : body.prompt) || "";
            const style = body.style || "auto";
            const finalPrompt = style === 'auto' ? prompt : `${prompt}, ${CONFIG.STYLE_PRESETS[style]?.prompt || ''}`;
            const n = Math.min(body.n || 1, 4);
            
            const urls = [];
            for(let i=0; i<n; i++) {
                const u = await generateImage(finalPrompt, model, i);
                if(u) urls.push(u);
            }
            
            if(body.stream) {
                 // Simple stream response for UI
                 const content = urls.map(u => `![Img](${u})`).join('\n');
                 return new Response(`data: ${JSON.stringify({choices:[{delta:{content}}]})}\n\ndata: [DONE]\n\n`, { headers: corsHeaders({'Content-Type':'text/event-stream'})});
            }
            return new Response(JSON.stringify({ data: urls.map(u => ({url:u})) }), { headers: corsHeaders() });
        } catch(e) {
            return new Response(JSON.stringify({error: e.message}), { status: 500, headers: corsHeaders() });
        }
    }
}

async function getAllModels() {
    if(!CACHED_MODELS) CACHED_MODELS = { ...CONFIG.POLLINATIONS_MODELS };
    return CACHED_MODELS;
}

async function generateImage(prompt, model, idx) {
    const m = (await getAllModels())[model];
    if(m.provider === 'pollinations') {
        const params = new URLSearchParams({ model: m.upstreamModel, width: 1024, height: 1024, nologo: 'true', nofeed: 'true' });
        return `${CONFIG.POLLINATIONS_ORIGIN}/prompt/${encodeURIComponent(prompt)}?${params}`;
    }
    return null; // Placeholder for Replicate
}

function verifyAuth(req, key) {
    const auth = req.headers.get('Authorization');
    return key === '1' || (auth && auth === `Bearer ${key}`);
}

function corsHeaders(h={}) { return { ...h, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }; }

function handleAgeVerification(req) {
    if (new URL(req.url).searchParams.get('verified') === 'true') 
        return new Response(null, { status: 302, headers: { 'Location': '/', 'Set-Cookie': 'age_verified=true; Path=/' } });
    return new Response(`<h1>18+ Verify</h1><button onclick="location.href='?verified=true'">I am 18+</button>`, { headers: {'Content-Type':'text/html'} });
}

function handleUI(req, apiKey) {
  if (CONFIG.SAFETY_CONFIG.requireAgeVerification && !req.headers.get('Cookie')?.includes('age_verified=true')) 
    return new Response(null, { status: 302, headers: { 'Location': '/age-verify' } });
    
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${CONFIG.PROJECT_NAME} v${CONFIG.PROJECT_VERSION}</title>
<style>
:root { --bg:#09090b; --panel:#18181b; --border:#27272a; --text:#e4e4e7; --primary:#f59e0b; }
body { font-family:sans-serif; background:var(--bg); color:var(--text); margin:0; height:100vh; display:flex; }
.sidebar { width:340px; background:var(--panel); border-right:1px solid var(--border); padding:20px; display:flex; flex-direction:column; gap:15px; }
.main { flex:1; display:flex; flex-direction:column; padding:20px; position:relative; }
.box { background:#27272a; padding:12px; border-radius:8px; border:1px solid #3f3f46; }
.tabs { display:flex; gap:5px; background:#111; padding:4px; border-radius:8px; }
.tab { flex:1; padding:8px; text-align:center; cursor:pointer; border-radius:6px; font-size:12px; color:#777; }
.tab.active { color:#fff; font-weight:bold; }
.tab.free.active { background:#064e3b; color:#34d399; }
.tab.pro.active { background:#1e3a8a; color:#60a5fa; }
input,select,textarea { width:100%; background:#111; border:1px solid #3f3f46; color:#fff; padding:8px; border-radius:6px; margin-top:5px; box-sizing:border-box; }
button { width:100%; padding:10px; background:var(--primary); border:none; border-radius:6px; font-weight:bold; cursor:pointer; margin-top:10px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:15px; overflow-y:auto; padding:10px; }
.img-card img { width:100%; border-radius:8px; cursor:pointer; }
/* History Modal */
.modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:999; align-items:center; justify-content:center; }
.modal-box { background:var(--panel); width:80%; height:80%; border-radius:12px; padding:20px; display:flex; flex-direction:column; }
</style>
</head>
<body>
<div class="sidebar">
    <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>🎨 FluxAI <small>v${CONFIG.PROJECT_VERSION}</small></h3>
        <button onclick="openHistory()" style="width:auto; padding:4px 8px; font-size:12px; background:#333; color:#fff;">📜 歷史</button>
    </div>
    
    <div class="tabs">
        <div class="tab free active" onclick="switchTab('pollinations')">🆓 免費通道</div>
        <div class="tab pro" onclick="switchTab('replicate')">💎 專業通道</div>
    </div>
    
    <div id="provider-info" class="box" style="font-size:12px; color:#6ee7b7; border-color:#059669; background:#064e3b;">
        ✨ 12個免費模型就緒
    </div>

    <div class="box">
        <label>🤖 模型</label>
        <select id="model"></select>
        
        <label>🎨 風格</label>
        <select id="style">${Object.keys(CONFIG.STYLE_PRESETS).map(k=>`<option value="${k}">${CONFIG.STYLE_PRESETS[k].name}</option>`).join('')}</select>
        
        <label>📝 提示詞</label>
        <textarea id="prompt" rows="4"></textarea>
        
        <label><input type="number" id="n" value="1" min="1" max="4" style="width:50px"> 張數</label>
        <button onclick="generate()">🚀 生成</button>
    </div>
    
    <details class="box" style="margin-top:auto;">
        <summary style="cursor:pointer; font-size:12px;">⚙️ 高級設置</summary>
        <input id="endpoint" value="${origin}/v1/chat/completions" placeholder="API Endpoint">
        <input id="key" value="${apiKey}" type="password" placeholder="API Key">
        <button onclick="saveConf()" style="background:#333; font-size:12px;">💾 保存</button>
    </details>
</div>

<div class="main">
    <div id="result" class="grid"></div>
</div>

<div id="hist-modal" class="modal">
    <div class="modal-box">
        <div style="display:flex; justify-content:space-between;"><h3>📜 歷史</h3><button onclick="closeHistory()" style="width:auto;">❌</button></div>
        <div id="hist-list" class="grid"></div>
    </div>
</div>

<script>
let MODELS = ${JSON.stringify(CONFIG.POLLINATIONS_MODELS)};
let PROVIDER = 'pollinations';
let CONFIG_LOCAL = JSON.parse(localStorage.getItem('flux_conf') || '{}');

// Init
function init() {
    if(CONFIG_LOCAL.endpoint) document.getElementById('endpoint').value = CONFIG_LOCAL.endpoint;
    if(CONFIG_LOCAL.key) document.getElementById('key').value = CONFIG_LOCAL.key;
    
    // 核心修復: 初始化時強制刷新列表
    switchTab('pollinations'); 
}

function switchTab(p) {
    PROVIDER = p;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab.' + (p==='pollinations'?'free':'pro')).classList.add('active');
    
    const info = document.getElementById('provider-info');
    if(p==='pollinations') {
        info.innerText = '✨ 12個免費模型就緒';
        info.style.background = '#064e3b';
    } else {
        info.innerText = '💎 專業付費模型';
        info.style.background = '#1e3a8a';
    }
    
    const sel = document.getElementById('model');
    const list = Object.values(MODELS).filter(m => m.provider === p);
    sel.innerHTML = list.length ? list.map(m => \`<option value="\${m.displayName}">\${m.displayName}</option>\`).join('') : '<option>加載中...</option>';
}

async function generate() {
    const btn = document.querySelector('button[onclick="generate()"]');
    btn.disabled = true; btn.innerText = '生成中...';
    
    const payload = {
        model: document.getElementById('model').value, // 簡單起見直接用 name
        messages: [{role:'user', content: document.getElementById('prompt').value}],
        style: document.getElementById('style').value,
        n: parseInt(document.getElementById('n').value),
        stream: true
    };
    
    const ep = document.getElementById('endpoint').value;
    const k = document.getElementById('key').value;
    
    try {
        const res = await fetch(ep, {
            method: 'POST',
            headers: {'Authorization': 'Bearer '+k, 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let txt = '';
        while(true) {
            const {done, value} = await reader.read();
            if(done) break;
            txt += dec.decode(value);
        }
        
        // Parse markdown images
        const urls = [...txt.matchAll(/\\((http.*?)\\)/g)].map(m=>m[1]);
        const grid = document.getElementById('result');
        grid.innerHTML = urls.map(u => \`<div class="img-card"><img src="\${u}" onclick="window.open(this.src)"></div>\`).join('');
        
        // Save history
        const hist = JSON.parse(localStorage.getItem('flux_hist')||'[]');
        urls.forEach(u => hist.unshift({url:u, time:new Date().toLocaleTimeString()}));
        localStorage.setItem('flux_hist', JSON.stringify(hist.slice(0,50)));
        
    } catch(e) { alert(e.message); }
    
    btn.disabled = false; btn.innerText = '🚀 生成';
}

function saveConf() {
    localStorage.setItem('flux_conf', JSON.stringify({
        endpoint: document.getElementById('endpoint').value,
        key: document.getElementById('key').value
    }));
    alert('Saved');
}

function openHistory() {
    document.getElementById('hist-modal').style.display = 'flex';
    const list = JSON.parse(localStorage.getItem('flux_hist')||'[]');
    document.getElementById('hist-list').innerHTML = list.map(i => \`<div><img src="\${i.url}" style="width:100%;border-radius:8px"><small>\${i.time}</small></div>\`).join('');
}
function closeHistory() { document.getElementById('hist-modal').style.display = 'none'; }

init();
</script></body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
