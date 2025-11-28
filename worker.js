// =================================================================================
//  項目: ai-generator-2api (Cloudflare Worker 單文件版)
//  版本: 2.16.0 (代號: Ultimate Edition)
//  作者: 首席AI執行官
//  日期: 2025-11-28
//
//  [v2.16.0 核心特性]
//  1. [新增] 歷史記錄畫廊 (本地存儲 + 圖片預覽)
//  2. [新增] 參數一鍵復用 (Reuse)
//  3. [新增] 分頁式 API 提供商界面 (Tabs)
//  4. [新增] 高級連接配置 (自定義 Endpoint/Token/Referrer)
//  5. [優化] 零延遲模型加載
// =================================================================================

// --- [第一部分: 核心配置] ---
const CONFIG = {
  PROJECT_NAME: "ai-generator-multi-model",
  PROJECT_VERSION: "2.16.0",
  
  API_MASTER_KEY: "1", 
  
  UPSTREAM_ORIGIN: "https://ai-image-generator.co",
  POLLINATIONS_ORIGIN: "https://image.pollinations.ai",
  
  // API 提供商配置
  API_PROVIDERS: {
    "pollinations": {
      name: "Pollinations",
      description: "免費無限 · 專業級模型",
      icon: "🆓",
      isFree: true,
      theme: "free", // 綠色主題
      features: ["12個免費模型", "無需積分", "Flux Pro/Kontext", "1-4張並發"]
    },
    "replicate": {
      name: "Replicate",
      description: "高端付費 · 官方模型",
      icon: "💎",
      isFree: false,
      theme: "pro", // 藍色主題
      features: ["7+個付費模型", "官方穩定版", "極致質量", "積分消耗"]
    }
  },
  
  DEFAULT_PROVIDER: "pollinations",
  
  // 安全配置
  SAFETY_CONFIG: {
    enableNSFW: true,
    requireAgeVerification: true,
    minAge: 18,
    logNSFWRequests: true,
  },
  
  // 模型緩存配置
  MODEL_CACHE_TTL: 3600,
  AUTO_REFRESH_MODELS: true,
  
  // 藝術風格預設
  STYLE_PRESETS: {
    "auto": { name: "自動", prompt: "", description: "讓AI自動選擇最佳風格" },
    "anime": { name: "日本動漫", prompt: "anime style, vibrant colors, manga art, Japanese animation, cel shading", description: "日本動畫風格,明亮色彩" },
    "manga": { name: "日本漫畫", prompt: "manga style, black and white, ink drawing, Japanese comic book art, detailed linework, screentone shading", description: "黑白漫畫風格,細膩線條" },
    "realistic": { name: "寫實照片", prompt: "photorealistic, highly detailed, 8k uhd, professional photography, natural lighting, dslr quality", description: "照片級寫實風格" },
    "oil-painting": { name: "油畫", prompt: "oil painting, classical art, brushstrokes visible, rich colors, canvas texture, Renaissance style", description: "古典油畫風格" },
    "watercolor": { name: "水彩畫", prompt: "watercolor painting, soft edges, translucent colors, artistic, flowing pigments, paper texture", description: "柔和水彩風格" },
    "cyberpunk": { name: "賽博朋克", prompt: "cyberpunk style, neon lights, futuristic, dark atmosphere, high tech low life, dystopian city", description: "未來霓虹科幻風格" },
    "fantasy": { name: "奇幻藝術", prompt: "fantasy art, magical, ethereal, detailed illustration, epic scene, dramatic lighting, concept art", description: "魔幻奇幻風格" },
    "sketch": { name: "素描", prompt: "pencil sketch, graphite drawing, hand drawn, artistic sketch, detailed shading, monochrome", description: "鉛筆素描風格" },
    "3d-render": { name: "3D渲染", prompt: "3d render, octane render, blender, highly detailed, smooth surfaces, professional 3d modeling, ray tracing", description: "三維建模渲染" },
    "pixel-art": { name: "像素藝術", prompt: "pixel art, 8bit style, retro gaming, pixelated, isometric, vibrant colors, nostalgic", description: "復古像素風格" },
    "comic": { name: "美式漫畫", prompt: "comic book style, bold lines, halftone dots, action pose, superhero art, dynamic composition", description: "美式漫畫風格" },
    "impressionism": { name: "印象派", prompt: "impressionist painting, loose brushwork, light and color emphasis, Monet style, outdoor scene", description: "莫內印象派風格" },
    "art-nouveau": { name: "新藝術", prompt: "art nouveau style, organic forms, flowing lines, decorative elements, elegant curves, vintage poster", description: "裝飾藝術風格" },
    "steampunk": { name: "蒸汽朋克", prompt: "steampunk style, Victorian era, brass and copper, gears and cogs, industrial, vintage machinery", description: "維多利亞機械風格" },
    "minimalist": { name: "極簡主義", prompt: "minimalist art, clean lines, simple composition, limited color palette, modern design, negative space", description: "簡約現代風格" },
    "surreal": { name: "超現實", prompt: "surrealist art, dreamlike, impossible geometry, Salvador Dali style, bizarre composition, subconscious imagery", description: "達利超現實風格" },
    "chinese-ink": { name: "中國水墨", prompt: "Chinese ink painting, sumi-e style, flowing brushstrokes, monochrome or minimal color, traditional Asian art", description: "傳統水墨畫風格" },
    "ukiyo-e": { name: "浮世繪", prompt: "ukiyo-e style, Japanese woodblock print, flat colors, bold outlines, Edo period art, Hokusai style", description: "日本浮世繪風格" }
  },
  
  DEFAULT_STYLE: "auto",
  
  // Pollinations 完整模型配置 (12個免費模型)
  POLLINATIONS_MODELS: {
    "pollinations-turbo": { displayName: "Pollinations Turbo", provider: "pollinations", upstreamModel: "turbo", credits: 0, speed: "very-fast", quality: "good", description: "超快速基礎模型", maxImages: 4, supportsNSFW: true, isFree: true, category: "basic" },
    "pollinations-flux": { displayName: "Pollinations Flux", provider: "pollinations", upstreamModel: "flux", credits: 0, speed: "fast", quality: "excellent", description: "高質量通用模型", maxImages: 4, supportsNSFW: true, isFree: true, category: "basic" },
    "pollinations-flux-pro": { displayName: "Pollinations Flux Pro ⭐", provider: "pollinations", upstreamModel: "flux-pro", credits: 0, speed: "medium", quality: "best", description: "專業級Flux Pro", maxImages: 4, supportsNSFW: true, isFree: true, category: "professional" },
    "pollinations-flux-1.1-pro": { displayName: "Pollinations Flux 1.1 Pro 🔥", provider: "pollinations", upstreamModel: "flux-1.1-pro", credits: 0, speed: "medium", quality: "best", description: "最新1.1版本", maxImages: 4, supportsNSFW: true, isFree: true, category: "professional" },
    "pollinations-flux-realism": { displayName: "Pollinations Flux Realism", provider: "pollinations", upstreamModel: "flux-realism", credits: 0, speed: "medium", quality: "excellent", description: "寫實風格特化", maxImages: 4, supportsNSFW: true, isFree: true, category: "professional" },
    "pollinations-flux-anime": { displayName: "Pollinations Flux Anime", provider: "pollinations", upstreamModel: "flux-anime", credits: 0, speed: "medium", quality: "excellent", description: "動漫風格特化", maxImages: 4, supportsNSFW: true, isFree: true, category: "specialized" },
    "pollinations-flux-3d": { displayName: "Pollinations Flux 3D", provider: "pollinations", upstreamModel: "flux-3d", credits: 0, speed: "medium", quality: "excellent", description: "3D渲染風格", maxImages: 4, supportsNSFW: true, isFree: true, category: "specialized" },
    "pollinations-flux-kontext": { displayName: "Pollinations Flux Kontext 🎯", provider: "pollinations", upstreamModel: "flux-kontext", credits: 0, speed: "medium", quality: "excellent", description: "情境理解增強", maxImages: 4, supportsNSFW: true, isFree: true, category: "specialized" },
    "pollinations-flux-kontext-por": { displayName: "Pollinations Kontext Por 🔥", provider: "pollinations", upstreamModel: "flux.1-kontext-por", credits: 0, speed: "medium", quality: "best", description: "Kontext Por版", maxImages: 4, supportsNSFW: true, isFree: true, category: "specialized" },
    "pollinations-flux-cablyai": { displayName: "Pollinations Flux CablyAI", provider: "pollinations", upstreamModel: "flux-cablyai", credits: 0, speed: "medium", quality: "excellent", description: "CablyAI增強版", maxImages: 4, supportsNSFW: true, isFree: true, category: "experimental" },
    "pollinations-any-dark": { displayName: "Pollinations Any Dark", provider: "pollinations", upstreamModel: "any-dark", credits: 0, speed: "fast", quality: "good", description: "暗色調風格", maxImages: 4, supportsNSFW: true, isFree: true, category: "experimental" },
    "pollinations-midjourney": { displayName: "Pollinations MJ Style", provider: "pollinations", upstreamModel: "midjourney", credits: 0, speed: "medium", quality: "excellent", description: "Midjourney風格", maxImages: 4, supportsNSFW: true, isFree: true, category: "experimental" }
  },
  
  UPSTREAM_MODEL_DEFAULTS: {
    maxImages: 4, supportsNSFW: true, isFree: false, speed: "medium", quality: "excellent"
  },
  MAX_IMAGES: 4,
  DEFAULT_NUM_IMAGES: 1,
};

let CACHED_MODELS = null;
let CACHE_TIMESTAMP = 0;

// --- [第二部分: Worker 入口] ---
export default {
  async fetch(request, env, ctx) {
    const apiKey = env.API_MASTER_KEY || CONFIG.API_MASTER_KEY;
    const url = new URL(request.url);
    
    if (request.method === 'OPTIONS') return handleCorsPreflight();
    if (url.pathname === '/age-verify') return handleAgeVerification(request);
    if (url.pathname === '/') return handleUI(request, apiKey);
    if (url.pathname === '/v1/chat/completions') return handleChatCompletions(request, apiKey);
    if (url.pathname === '/v1/images/generations') return handleImageGenerations(request, apiKey);
    if (url.pathname === '/v1/models') return handleModelsRequest();
    if (url.pathname === '/v1/models/refresh') return handleModelsRefresh(request, apiKey);
    if (url.pathname === '/v1/styles') return handleStylesRequest();
    if (url.pathname === '/v1/providers') return handleProvidersRequest();
    
    return createErrorResponse(`Endpoint not found: ${url.pathname}`, 404, 'not_found');
  }
};

// --- [第三部分: 核心邏輯] ---
class Logger {
    constructor() { this.logs = []; }
    add(step, data) {
        const time = new Date().toISOString().split('T')[1].slice(0, -1);
        this.logs.push({ time, step, data });
        console.log(`[${step}]`, data);
    }
    get() { return this.logs; }
}

function generateFingerprint() {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * 16)];
    return result;
}

function getFakeHeaders(fingerprint, anonUserId) {
    const ip = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
    return {
        headers: {
            "accept": "*/*",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
            "content-type": "application/json",
            "origin": CONFIG.UPSTREAM_ORIGIN,
            "referer": `${CONFIG.UPSTREAM_ORIGIN}/`,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-Forwarded-For": ip,
            "X-Real-IP": ip
        }
    };
}

function applyStyleToPrompt(prompt, style) {
    const styleConfig = CONFIG.STYLE_PRESETS[style];
    if (!style || style === "auto" || !styleConfig) return prompt;
    return `${prompt}, ${styleConfig.prompt}`;
}

async function fetchUpstreamModels() {
    try {
        const { headers } = getFakeHeaders(generateFingerprint(), crypto.randomUUID());
        const response = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/models`, { method: 'GET', headers: headers });
        if (!response.ok) return null;
        const data = await response.json();
        return Array.isArray(data.models) ? data.models : null;
    } catch (e) { return null; }
}

function convertUpstreamModel(upstreamModel) {
    return {
        displayName: upstreamModel.displayName || upstreamModel.name || upstreamModel.id,
        provider: upstreamModel.provider || "replicate",
        credits: upstreamModel.credits || 2,
        speed: upstreamModel.speed || "medium",
        quality: upstreamModel.quality || "excellent",
        description: upstreamModel.description || "AI圖像生成模型",
        maxImages: upstreamModel.maxImages || 4,
        supportsNSFW: upstreamModel.supportsNSFW !== false,
        isFree: false,
        category: "premium",
        lastUpdated: new Date().toISOString()
    };
}

async function getAllModels() {
    const now = Date.now();
    if (CACHED_MODELS && (now - CACHE_TIMESTAMP) < CONFIG.MODEL_CACHE_TTL * 1000) return CACHED_MODELS;
    
    const upstreamModels = await fetchUpstreamModels();
    const allModels = { ...CONFIG.POLLINATIONS_MODELS };
    
    if (upstreamModels) {
        upstreamModels.forEach(m => {
            const id = m.id || m.name;
            if (id && !allModels[id]) allModels[id] = convertUpstreamModel(m);
        });
    }
    
    CACHED_MODELS = allModels;
    CACHE_TIMESTAMP = now;
    return allModels;
}

function getModelConfig(model) {
    return (CACHED_MODELS && CACHED_MODELS[model]) || CONFIG.POLLINATIONS_MODELS[model] || CONFIG.POLLINATIONS_MODELS["pollinations-flux"];
}

function convertAspectRatio(ratio) {
    const map = { "1:1": {w:1024,h:1024}, "16:9": {w:1920,h:1080}, "9:16": {w:1080,h:1920}, "4:3": {w:1024,h:768}, "3:4": {w:768,h:1024} };
    return map[ratio] || {w:1024,h:1024};
}

async function performPollinationsGeneration(prompt, model, aspectRatio, logger, index, safeMode, extraHeaders = {}) {
    const modelConfig = getModelConfig(model);
    const dims = convertAspectRatio(aspectRatio);
    const referrer = extraHeaders['X-Pollinations-Referrer'] || '';
    
    logger.add(`[IMG ${index+1}] Pollinations`, { model: modelConfig.upstreamModel, dims });
    
    const params = new URLSearchParams({
        model: modelConfig.upstreamModel,
        width: dims.w.toString(),
        height: dims.h.toString(),
        nologo: "true",
        enhance: safeMode ? "false" : "true",
        nofeed: "true"
    });
    if(referrer) params.append("referrer", referrer);
    
    const imageUrl = `${CONFIG.POLLINATIONS_ORIGIN}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    
    try {
        const res = await fetch(imageUrl, { method: 'HEAD' });
        if(res.ok) return imageUrl;
        throw new Error(`Status ${res.status}`);
    } catch(e) {
        throw e;
    }
}

async function performUpstreamGeneration(prompt, model, aspectRatio, logger, index, safeMode) {
    const fingerprint = generateFingerprint();
    const { headers } = getFakeHeaders(fingerprint, crypto.randomUUID());
    const modelConfig = getModelConfig(model);
    
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    formData.append("num_outputs", "1");
    formData.append("style", safeMode ? "auto" : "none");
    formData.append("safe_mode", safeMode ? "true" : "false");
    formData.append("aspectRatio", aspectRatio);
    formData.append("fingerprint_id", fingerprint);
    formData.append("provider", modelConfig.provider);

    delete headers["content-type"]; 
    const response = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/gen-image`, { method: "POST", headers, body: formData });
    
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    const data = await response.json();
    if (data.code === 0 && data.data?.[0]?.url) return data.data[0].url;
    throw new Error(data.message || "Unknown error");
}

async function performBatchGeneration(prompt, model, aspectRatio, numImages, logger, safeMode, extraHeaders = {}) {
    const modelConfig = getModelConfig(model);
    const count = Math.min(numImages, modelConfig.maxImages || 1);
    const promises = [];
    
    for (let i = 0; i < count; i++) {
        if (modelConfig.provider === "pollinations") {
            promises.push(performPollinationsGeneration(prompt, model, aspectRatio, logger, i, safeMode, extraHeaders).catch(e => null));
        } else {
            promises.push(performUpstreamGeneration(prompt, model, aspectRatio, logger, i, safeMode).catch(e => null));
        }
    }
    
    const results = await Promise.all(promises);
    return results.filter(url => url !== null);
}

async function handleChatCompletions(request, apiKey) {
    const logger = new Logger();
    if (!verifyAuth(request, apiKey)) return createErrorResponse('Unauthorized', 401);

    try {
        const body = await request.json();
        const isWebUI = body.is_web_ui === true;
        const messages = body.messages || [];
        const prompt = messages[messages.length - 1]?.content || "";
        const style = body.style || CONFIG.DEFAULT_STYLE;
        const styledPrompt = applyStyleToPrompt(prompt, style);
        
        await getAllModels();
        const model = body.model || "pollinations-flux";
        const numImages = Math.min(Math.max(1, body.n || 1), 4);
        const ratio = body.aspect_ratio || "1:1";
        const safeMode = body.safe_mode !== false;
        
        // 提取額外頭信息
        const extraHeaders = {};
        const referrer = request.headers.get('X-Pollinations-Referrer');
        if(referrer) extraHeaders['X-Pollinations-Referrer'] = referrer;

        const imageUrls = await performBatchGeneration(styledPrompt, model, ratio, numImages, logger, safeMode, extraHeaders);
        if (imageUrls.length === 0) throw new Error("Generation failed");

        const respContent = imageUrls.map((url, i) => `![Image ${i+1}](${url})`).join('\n');
        
        if (body.stream) {
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();
            
            (async () => {
                if (isWebUI) await writer.write(encoder.encode(`data: ${JSON.stringify({ debug: logger.get() })}\n\n`));
                await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: respContent } }] })}\n\n`));
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                await writer.close();
            })();
            
            return new Response(readable, { headers: corsHeaders({ 'Content-Type': 'text/event-stream' }) });
        }
        
        return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: respContent } }] }), { headers: corsHeaders() });
    } catch (e) {
        return createErrorResponse(e.message, 500);
    }
}

async function handleImageGenerations(request, apiKey) {
    return handleChatCompletions(request, apiKey); // 簡化復用邏輯
}

function verifyAuth(request, validKey) {
    if (validKey === "1") return true; 
    const auth = request.headers.get('Authorization');
    return auth && auth === `Bearer ${validKey}`;
}

function createErrorResponse(message, status) {
    return new Response(JSON.stringify({ error: { message, type: 'api_error' } }), { status, headers: corsHeaders() });
}

function handleCorsPreflight() { return new Response(null, { status: 204, headers: corsHeaders() }); }
function corsHeaders(h={}) { return { ...h, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }; }

async function handleModelsRequest() {
    const allModels = await getAllModels();
    return new Response(JSON.stringify({ data: Object.values(allModels).map(m => ({ id: m.displayName, ...m })) }), { headers: corsHeaders() });
}

async function handleModelsRefresh(request, apiKey) {
    CACHED_MODELS = null;
    return handleModelsRequest();
}

function handleStylesRequest() {
    return new Response(JSON.stringify({ data: CONFIG.STYLE_PRESETS }), { headers: corsHeaders() });
}

function handleProvidersRequest() {
    return new Response(JSON.stringify({ data: CONFIG.API_PROVIDERS }), { headers: corsHeaders() });
}

function handleAgeVerification(request) {
    const verified = new URL(request.url).searchParams.get('verified') === 'true';
    if (verified) return new Response(null, { status: 302, headers: { 'Location': '/', 'Set-Cookie': 'age_verified=true; Max-Age=86400; Path=/' } });
    
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Verify</title><style>body{background:#09090b;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif}.box{background:#18181b;padding:40px;border-radius:10px;text-align:center}button{padding:10px 20px;background:#f59e0b;border:none;border-radius:5px;cursor:pointer;margin:10px}</style></head><body><div class="box"><h1>🔞 Age Verification</h1><p>You must be 18+ to use this tool.</p><button onclick="location.href='?verified=true'">I am 18+</button><button onclick="location.href='https://google.com'" style="background:#333;color:#fff">Exit</button></div></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

function handleUI(request, apiKey) {
  if (CONFIG.SAFETY_CONFIG.requireAgeVerification && !request.headers.get('Cookie')?.includes('age_verified=true')) {
    return new Response(null, { status: 302, headers: { 'Location': '/age-verify' } });
  }
  
  const origin = new URL(request.url).origin;
  const styleOptions = Object.keys(CONFIG.STYLE_PRESETS).map(k => `<option value="\\${k}" \\${k==='auto'?'selected':''}>\\${CONFIG.STYLE_PRESETS[k].name}</option>`).join('');
  const initModels = JSON.stringify(CONFIG.POLLINATIONS_MODELS);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\\${CONFIG.PROJECT_NAME} v\\${CONFIG.PROJECT_VERSION}</title>
<style>
:root { --bg:#09090b; --panel:#18181b; --border:#27272a; --text:#e4e4e7; --primary:#f59e0b; --accent:#3b82f6; }
body { font-family:'Segoe UI',sans-serif; background:var(--bg); color:var(--text); margin:0; height:100vh; display:flex; overflow:hidden; }
.sidebar { width:360px; background:var(--panel); border-right:1px solid var(--border); padding:20px; display:flex; flex-direction:column; overflow-y:auto; }
.main { flex:1; display:flex; flex-direction:column; padding:20px; background:#000; position:relative; }
.box { background:#27272a; padding:15px; border-radius:8px; border:1px solid #3f3f46; margin-bottom:15px; }
.tabs { display:flex; gap:8px; margin-bottom:15px; background:#111; padding:4px; border-radius:8px; }
.tab { flex:1; padding:8px; text-align:center; cursor:pointer; border-radius:6px; font-size:12px; font-weight:bold; color:#71717a; transition:0.2s; }
.tab.active { color:#fff; }
.tab.free.active { background:#064e3b; color:#34d399; }
.tab.pro.active { background:#1e3a8a; color:#60a5fa; }
input,select,textarea { width:100%; background:#111; border:1px solid #3f3f46; color:#fff; padding:10px; border-radius:6px; margin-bottom:10px; box-sizing:border-box; }
button { width:100%; padding:12px; background:var(--primary); border:none; border-radius:6px; font-weight:bold; cursor:pointer; color:#000; }
.result-area { flex:1; display:flex; align-items:center; justify-content:center; overflow:auto; background:radial-gradient(circle,#1a1a1a,#000); border-radius:12px; border:1px solid var(--border); padding:20px; }
.image-grid { display:flex; flex-wrap:wrap; gap:15px; justify-content:center; width:100%; }
.image-item { width:300px; max-width:100%; }
.result-img { width:100%; border-radius:8px; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,0.5); }
.spinner { width:24px; height:24px; border:3px solid #333; border-top-color:var(--primary); border-radius:50%; animation:spin 1s infinite; display:none; }
@keyframes spin { to { transform:rotate(360deg); } }
/* Modal & History */
.modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(5px); z-index:1000; align-items:center; justify-content:center; }
.modal-content { background:var(--panel); width:90%; max-width:1000px; height:80%; border-radius:12px; padding:20px; display:flex; flex-direction:column; }
.history-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:15px; overflow-y:auto; padding:10px; }
.history-card { background:#27272a; border-radius:8px; overflow:hidden; border:1px solid #3f3f46; position:relative; }
.history-card img { width:100%; height:150px; object-fit:cover; cursor:pointer; }
.history-actions { padding:8px; display:flex; justify-content:space-between; }
.btn-icon { padding:4px 8px; font-size:12px; width:auto; background:#3f3f46; color:#fff; }
.label { font-size:12px; color:#a1a1aa; display:block; margin-bottom:5px; font-weight:600; }
</style>
</head>
<body>
<div class="sidebar">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 style="margin:0; font-size:18px;">🎨 FluxAI <span class="badge" style="background:var(--primary);color:#000;font-size:10px;padding:2px 5px;border-radius:4px;">v\\${CONFIG.PROJECT_VERSION}</span></h2>
        <button onclick="openHistory()" style="width:auto; padding:5px 10px; font-size:12px; background:#3f3f46; color:#fff;">📜 歷史</button>
    </div>

    <div class="tabs">
        <div class="tab free active" onclick="switchTab('pollinations')">🆓 免費通道</div>
        <div class="tab pro" onclick="switchTab('replicate')">💎 專業通道</div>
    </div>
    
    <div id="provider-info" class="box" style="background:#064e3b; border-color:#059669; color:#6ee7b7; font-size:12px; padding:10px;">
        ✨ 12個模型就緒 · 完全免費
    </div>

    <div class="box">
        <span class="label">🤖 AI 模型</span>
        <select id="model" onchange="updateModelInfo()"></select>
        <div id="model-desc" style="font-size:11px; color:#a1a1aa; margin-top:5px;"></div>

        <span class="label" style="margin-top:10px;">🎨 藝術風格</span>
        <select id="style">\\${styleOptions}</select>

        <div style="display:flex; gap:10px; margin-top:10px;">
            <div style="flex:1;">
                <span class="label">數量</span>
                <select id="num-images">
                    <option value="1">1 張</option><option value="2">2 張</option>
                    <option value="3">3 張</option><option value="4">4 張</option>
                </select>
            </div>
            <div style="flex:1;">
                <span class="label">比例</span>
                <select id="ratio">
                    <option value="1:1">1:1</option><option value="16:9">16:9</option>
                    <option value="9:16">9:16</option><option value="4:3">4:3</option>
                </select>
            </div>
        </div>

        <label style="display:flex; align-items:center; margin:10px 0; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="safe-mode" checked style="width:auto; margin-right:8px;"> 🛡️ 安全模式
        </label>

        <textarea id="prompt" rows="4" placeholder="描述你想生成的圖片..."></textarea>
        <button id="btn-gen" onclick="generate()">🚀 開始生成</button>
    </div>

    <details class="box" style="border-color:#4b5563; margin-top:auto;">
        <summary style="cursor:pointer; font-size:12px; font-weight:bold; color:#9ca3af;">⚙️ 高級連接設置</summary>
        <div style="margin-top:10px;">
            <div style="font-size:11px; color:#f59e0b; margin-bottom:5px;">📡 API 連接 (本站)</div>
            <input type="text" id="custom-endpoint" value="\\${origin}/v1/chat/completions" placeholder="Endpoint">
            <input type="password" id="custom-key" value="\\${apiKey}" placeholder="API Key">
            
            <div style="font-size:11px; color:#10b981; margin:10px 0 5px;">🎨 Pollinations 參數</div>
            <input type="text" id="pollinations-referrer" placeholder="Referrer">
            <button onclick="saveSettings()" style="background:#374151; font-size:12px; padding:8px;">💾 保存並刷新</button>
        </div>
    </details>
</div>

<div class="main">
    <div class="result-area" id="result-container">
        <div style="text-align:center; color:#52525b;">
            <div style="font-size:48px; margin-bottom:10px;">🎨</div>
            <div>輸入提示詞開始創作</div>
            <div class="spinner" id="spinner" style="margin:20px auto;"></div>
        </div>
    </div>
    <div id="status-bar" style="height:30px; display:flex; align-items:center; justify-content:space-between; color:#71717a; font-size:12px; border-top:1px solid #27272a; margin-top:10px; padding-top:10px;">
        <span id="status-text">就緒</span>
        <span id="time-text"></span>
    </div>
</div>

<!-- History Modal -->
<div id="history-modal" class="modal">
    <div class="modal-content">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <h3 style="margin:0;">📜 歷史記錄</h3>
            <div>
                <button class="btn-icon" onclick="clearHistory()" style="background:#7f1d1d;">🗑️ 清空</button>
                <button class="btn-icon" onclick="closeHistory()">❌ 關閉</button>
            </div>
        </div>
        <div id="history-list" class="history-grid"></div>
    </div>
</div>

<script>
const DEFAULT_ENDPOINT = "\\${origin}/v1/chat/completions";
const DEFAULT_KEY = "\\${apiKey}";
let ENDPOINT = DEFAULT_ENDPOINT;
let API_KEY = DEFAULT_KEY;

// 預注入模型數據，實現零延遲
let MODEL_DB = \\${initModels}; 
let CURRENT_PROVIDER = "pollinations";

// 初始化
function init() {
    loadSettings();
    updateModelList();
    // 後台靜默刷新
    fetch("\\${origin}/v1/models").then(r=>r.json()).then(d => {
        if(d.data) {
            const newDB = {};
            d.data.forEach(m => newDB[m.id] = m);
            MODEL_DB = newDB; // 更新數據庫
            updateModelList(); // 刷新UI
        }
    });
}

function switchTab(provider) {
    CURRENT_PROVIDER = provider;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(\`.tab.\${provider === 'pollinations' ? 'free' : 'pro'}\`).classList.add('active');
    
    const infoBox = document.getElementById('provider-info');
    if (provider === 'pollinations') {
        infoBox.style.background = '#064e3b'; infoBox.style.borderColor = '#059669'; infoBox.style.color = '#6ee7b7';
        infoBox.innerText = '✨ 12個模型就緒 · 完全免費';
    } else {
        infoBox.style.background = '#1e3a8a'; infoBox.style.borderColor = '#3b82f6'; infoBox.style.color = '#93c5fd';
        infoBox.innerText = '💎 高端付費模型 · 需要積分';
    }
    updateModelList();
}

function updateModelList() {
    const select = document.getElementById('model');
    const models = Object.values(MODEL_DB).filter(m => m.provider === CURRENT_PROVIDER);
    
    // 分組邏輯
    const groups = { 'basic': '🚀 基礎', 'professional': '🌟 專業', 'specialized': '🎯 特化', 'experimental': '✨ 實驗', 'premium': '💎 高端' };
    let html = '';
    
    Object.keys(groups).forEach(cat => {
        const catModels = models.filter(m => m.category === cat);
        if (catModels.length > 0) {
            html += \`<optgroup label="\${groups[cat]}">\`;
            catModels.forEach(m => html += \`<option value="\${m.id}">\${m.displayName}</option>\`);
            html += '</optgroup>';
        }
    });
    
    select.innerHTML = html || '<option>無可用模型</option>';
    updateModelInfo();
}

function updateModelInfo() {
    const id = document.getElementById('model').value;
    const m = MODEL_DB[id];
    if(m) document.getElementById('model-desc').innerText = \`\${m.description} (\${m.isFree ? '免費' : m.credits+'積分'})\`;
}

// 歷史記錄功能
const History = {
    add: (item) => {
        const list = JSON.parse(localStorage.getItem('flux_history') || '[]');
        list.unshift(item);
        if(list.length > 50) list.pop();
        localStorage.setItem('flux_history', JSON.stringify(list));
    },
    get: () => JSON.parse(localStorage.getItem('flux_history') || '[]'),
    clear: () => { localStorage.removeItem('flux_history'); renderHistory(); }
};

function openHistory() {
    document.getElementById('history-modal').style.display = 'flex';
    renderHistory();
}
function closeHistory() { document.getElementById('history-modal').style.display = 'none'; }
function clearHistory() { if(confirm('確定清空?')) History.clear(); }

function renderHistory() {
    const list = History.get();
    const container = document.getElementById('history-list');
    container.innerHTML = list.map(item => \`
        <div class="history-card">
            <img src="\${item.url}" onclick="window.open(this.src)">
            <div class="history-actions">
                <span class="label" style="margin:0">\${item.time}</span>
                <button class="btn-icon" onclick="reuseParams('\${item.prompt}', '\${item.model}', '\${item.style}')">♻️ 復用</button>
            </div>
        </div>
    \`).join('') || '<div style="color:#aaa; text-align:center; grid-column:1/-1;">暫無歷史記錄</div>';
}

function reuseParams(p, m, s) {
    document.getElementById('prompt').value = p;
    // 如果模型不在當前Tab，自動切換
    const targetModel = MODEL_DB[m];
    if(targetModel && targetModel.provider !== CURRENT_PROVIDER) switchTab(targetModel.provider);
    setTimeout(() => {
        document.getElementById('model').value = m;
        document.getElementById('style').value = s;
        closeHistory();
    }, 100);
}

// 設置與生成
function loadSettings() {
    const s = JSON.parse(localStorage.getItem('flux_settings') || '{}');
    if(s.endpoint) {
        document.getElementById('custom-endpoint').value = s.endpoint;
        ENDPOINT = s.endpoint;
    }
    if(s.key) {
        document.getElementById('custom-key').value = s.key;
        API_KEY = s.key;
    }
    if(s.referrer) document.getElementById('pollinations-referrer').value = s.referrer;
}

function saveSettings() {
    const s = {
        endpoint: document.getElementById('custom-endpoint').value,
        key: document.getElementById('custom-key').value,
        referrer: document.getElementById('pollinations-referrer').value
    };
    localStorage.setItem('flux_settings', JSON.stringify(s));
    ENDPOINT = s.endpoint || DEFAULT_ENDPOINT;
    API_KEY = s.key || DEFAULT_KEY;
    alert('配置已保存並刷新');
    location.reload(); // 簡單重載以應用
}

async function generate() {
    const prompt = document.getElementById('prompt').value.trim();
    if(!prompt) return alert('請輸入提示詞');
    
    const btn = document.getElementById('btn-gen');
    const spinner = document.getElementById('spinner');
    const container = document.getElementById('result-container');
    
    btn.disabled = true; btn.innerText = '生成中...';
    spinner.style.display = 'block';
    container.innerHTML = ''; // 清空舊圖
    container.appendChild(spinner);
    
    const model = document.getElementById('model').value;
    const style = document.getElementById('style').value;
    const startTime = Date.now();
    
    try {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Type': 'application/json',
                'X-Pollinations-Referrer': document.getElementById('pollinations-referrer').value
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                stream: true,
                n: parseInt(document.getElementById('num-images').value),
                aspect_ratio: document.getElementById('ratio').value,
                safe_mode: document.getElementById('safe-mode').checked,
                style: style,
                is_web_ui: true
            })
        });
        
        if(!res.ok) throw new Error((await res.json()).error?.message || 'Error');
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        while(true) {
            const {done, value} = await reader.read();
            if(done) break;
            const chunk = decoder.decode(value);
            // 簡單解析流式數據
            chunk.split('\\n').forEach(line => {
                if(line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.substring(6));
                        if(json.choices?.[0]?.delta?.content) fullText += json.choices[0].delta.content;
                    } catch(e){}
                }
            });
        }
        
        // 解析 Markdown 圖片
        const urls = [...fullText.matchAll(/\\!\\[.*?\\]\\((.*?)\\)/g)].map(m => m[1]);
        if(urls.length > 0) {
            container.innerHTML = \`<div class="image-grid">\${urls.map(u => \`<div class="image-item"><img src="\${u}" class="result-img" onclick="window.open(this.src)"></div>\`).join('')}</div>\`;
            document.getElementById('status-text').innerText = \`✅ 成功生成 \${urls.length} 張\`;
            document.getElementById('time-text').innerText = \`\${((Date.now()-startTime)/1000).toFixed(2)}s\`;
            
            // 保存歷史
            urls.forEach(u => History.add({
                url: u, prompt, model, style, time: new Date().toLocaleTimeString()
            }));
        } else {
            throw new Error('未收到圖片數據');
        }
        
    } catch(e) {
        container.innerHTML = \`<div style="color:#ef4444">❌ \${e.message}</div>\`;
        document.getElementById('status-text').innerText = '失敗';
    } finally {
        btn.disabled = false; btn.innerText = '🚀 開始生成';
        spinner.style.display = 'none';
    }
}

// 啟動
init();
</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
