// =================================================================================
//  项目: ai-generator-2api (Cloudflare Worker 单文件版)
//  版本: 2.6.0 (代号: Multi-Model Edition)
//  作者: 首席AI执行官
//  日期: 2025-11-28
//
//  [v2.6.0 变更日志]
//  1. [新增] 支持多个 AI 模型: Flux 系列, Stable Diffusion, DALL-E
//  2. [增强] 模型配置系统,自动路由到对应 provider
//  3. [优化] Web UI 支持模型选择
//  4. [保留] 多张图片生成功能
// =================================================================================

// --- [第一部分: 核心配置] ---
const CONFIG = {
  PROJECT_NAME: "ai-generator-multi-model",
  PROJECT_VERSION: "2.6.0",
  
  // ⚠️ 请在 Cloudflare 环境变量中设置 API_MASTER_KEY，或者修改此处
  API_MASTER_KEY: "1", 
  
  UPSTREAM_ORIGIN: "https://ai-image-generator.co",
  
  // 多模型支持
  MODELS: [
    "flux-schnell",
    "flux-dev",
    "flux-pro",
    "flux-1.1-pro",
    "stable-diffusion-xl",
    "stable-diffusion-3",
    "dall-e-3"
  ],
  
  DEFAULT_MODEL: "flux-schnell",
  
  // 模型配置: 每个模型的参数
  MODEL_CONFIGS: {
    "flux-schnell": {
      displayName: "Flux Schnell",
      provider: "replicate",
      credits: 1,
      speed: "fast",
      quality: "good",
      description: "快速生成,适合快速迭代"
    },
    "flux-dev": {
      displayName: "Flux Dev",
      provider: "replicate",
      credits: 2,
      speed: "medium",
      quality: "excellent",
      description: "开发版本,高质量输出"
    },
    "flux-pro": {
      displayName: "Flux Pro",
      provider: "replicate",
      credits: 5,
      speed: "slow",
      quality: "best",
      description: "专业版本,最高质量"
    },
    "flux-1.1-pro": {
      displayName: "Flux 1.1 Pro",
      provider: "replicate",
      credits: 6,
      speed: "slow",
      quality: "best",
      description: "2025最新版本,性能更强"
    },
    "stable-diffusion-xl": {
      displayName: "Stable Diffusion XL",
      provider: "stability",
      credits: 2,
      speed: "medium",
      quality: "excellent",
      description: "开源经典模型"
    },
    "stable-diffusion-3": {
      displayName: "Stable Diffusion 3",
      provider: "stability",
      credits: 3,
      speed: "medium",
      quality: "excellent",
      description: "SD3 最新版本"
    },
    "dall-e-3": {
      displayName: "DALL-E 3",
      provider: "openai",
      credits: 4,
      speed: "medium",
      quality: "excellent",
      description: "OpenAI 官方模型"
    }
  },
  
  // 多图生成配置
  MAX_IMAGES: 4,
  DEFAULT_NUM_IMAGES: 1,
};

// --- [第二部分: Worker 入口路由] ---
export default {
  async fetch(request, env, ctx) {
    const apiKey = env.API_MASTER_KEY || CONFIG.API_MASTER_KEY;
    const url = new URL(request.url);
    
    // 1. CORS 预检
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight();
    }

    // 2. 开发者驾驶舱 (Web UI)
    if (url.pathname === '/') {
      return handleUI(request, apiKey);
    } 
    // 3. 聊天接口
    else if (url.pathname === '/v1/chat/completions') {
      return handleChatCompletions(request, apiKey);
    } 
    // 4. 绘图接口
    else if (url.pathname === '/v1/images/generations') {
      return handleImageGenerations(request, apiKey);
    }
    // 5. 模型列表
    else if (url.pathname === '/v1/models') {
      return handleModelsRequest();
    } 
    else {
      return createErrorResponse(`Endpoint not found: ${url.pathname}`, 404, 'not_found');
    }
  }
};

// --- [第三部分: 核心业务逻辑] ---

// 日志记录器类
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
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
}

function generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function getFakeHeaders(fingerprint, anonUserId) {
    const fakeIP = generateRandomIP();
    return {
        headers: {
            "accept": "*/*",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
            "content-type": "application/json",
            "origin": CONFIG.UPSTREAM_ORIGIN,
            "referer": `${CONFIG.UPSTREAM_ORIGIN}/`,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            "X-Forwarded-For": fakeIP,
            "X-Real-IP": fakeIP,
            "CF-Connecting-IP": fakeIP,
            "True-Client-IP": fakeIP,
            "X-Client-IP": fakeIP,
            "Cookie": `anon_user_id=${anonUserId};`
        },
        fakeIP: fakeIP
    };
}

/**
 * 根据模型获取配置
 */
function getModelConfig(model) {
    return CONFIG.MODEL_CONFIGS[model] || CONFIG.MODEL_CONFIGS[CONFIG.DEFAULT_MODEL];
}

/**
 * 执行上游生成流程 (单张图片)
 */
async function performUpstreamGeneration(prompt, model, aspectRatio, logger, index = 0) {
    const fingerprint = generateFingerprint();
    const anonUserId = crypto.randomUUID(); 
    const { headers, fakeIP } = getFakeHeaders(fingerprint, anonUserId);
    const modelConfig = getModelConfig(model);
    
    const logPrefix = index > 0 ? `[Image ${index+1}]` : "";
    
    logger.add(`${logPrefix}Identity Created`, { 
        model: model,
        provider: modelConfig.provider,
        fingerprint, 
        anonUserId, 
        fakeIP: fakeIP
    });

    // 扣费
    const deductPayload = {
        "trans_type": "image_generation",
        "credits": modelConfig.credits,
        "model": model,
        "numOutputs": 1,
        "fingerprint_id": fingerprint
    };

    try {
        logger.add(`${logPrefix}Deduct Request`, deductPayload);
        const deductRes = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/credits/deduct`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(deductPayload)
        });
        
        const deductText = await deductRes.text();
        let deductJson;
        try { deductJson = JSON.parse(deductText); } catch(e) { deductJson = deductText; }
        
        logger.add(`${logPrefix}Deduct Response`, { 
            status: deductRes.status, 
            body: deductJson 
        });

    } catch (e) {
        logger.add(`${logPrefix}Deduct Error`, e.message);
    }

    // 生成
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    formData.append("num_outputs", "1");
    formData.append("inputMode", "text");
    formData.append("style", "auto");
    formData.append("aspectRatio", aspectRatio || "1:1");
    formData.append("fingerprint_id", fingerprint);
    formData.append("provider", modelConfig.provider);

    const genHeaders = { ...headers };
    delete genHeaders["content-type"]; 

    logger.add(`${logPrefix}Generation Request`, {
        url: `${CONFIG.UPSTREAM_ORIGIN}/api/gen-image`,
        provider: modelConfig.provider,
        model: model,
        prompt: prompt.substring(0, 50) + "...",
        aspectRatio: aspectRatio
    });

    const response = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/gen-image`, {
        method: "POST",
        headers: genHeaders,
        body: formData
    });

    const respText = await response.text();
    let data;
    try {
        data = JSON.parse(respText);
    } catch (e) {
        logger.add(`${logPrefix}Parse Error`, respText);
        throw new Error(`Upstream returned non-JSON: ${respText.substring(0, 100)}`);
    }

    logger.add(`${logPrefix}Generation Response`, data);

    if (!response.ok) {
        throw new Error(`Upstream Error (${response.status}): ${JSON.stringify(data)}`);
    }
    
    if (data.code === 0 && data.data && data.data.length > 0) {
        return data.data[0].url;
    } else {
        throw new Error(data.message || "Unknown upstream error");
    }
}

/**
 * 批量生成多张图片
 */
async function performBatchGeneration(prompt, model, aspectRatio, numImages, logger) {
    const count = Math.min(Math.max(1, numImages), CONFIG.MAX_IMAGES);
    
    logger.add("Batch Generation Start", { 
        requestedImages: numImages, 
        actualImages: count,
        model: model,
        prompt: prompt.substring(0, 80) + "..."
    });

    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(
            performUpstreamGeneration(prompt, model, aspectRatio, logger, i)
                .catch(err => {
                    logger.add(`Image ${i+1} Failed`, err.message);
                    return null;
                })
        );
    }

    const results = await Promise.all(promises);
    const successImages = results.filter(url => url !== null);
    
    logger.add("Batch Generation Complete", { 
        success: successImages.length, 
        failed: count - successImages.length,
        urls: successImages
    });

    return successImages;
}

/**
 * 处理 Chat 接口
 */
async function handleChatCompletions(request, apiKey) {
    const logger = new Logger();
    
    if (!verifyAuth(request, apiKey)) return createErrorResponse('Unauthorized', 401, 'unauthorized');

    try {
        const body = await request.json();
        const isWebUI = body.is_web_ui === true;

        const messages = body.messages || [];
        const lastMsg = messages[messages.length - 1];
        
        if (!lastMsg) throw new Error("No messages found");

        let prompt = "";
        if (typeof lastMsg.content === 'string') {
            prompt = lastMsg.content;
        } else if (Array.isArray(lastMsg.content)) {
            for (const part of lastMsg.content) {
                if (part.type === 'text') {
                    prompt += part.text + " ";
                }
            }
        }

        // 支持模型选择
        const requestedModel = body.model || CONFIG.DEFAULT_MODEL;
        const model = CONFIG.MODELS.includes(requestedModel) ? requestedModel : CONFIG.DEFAULT_MODEL;
        
        const numImages = Math.min(
            Math.max(1, body.n || body.num_images || CONFIG.DEFAULT_NUM_IMAGES), 
            CONFIG.MAX_IMAGES
        );
        
        const aspectRatio = body.aspect_ratio || body.size || "1:1";
        let finalAspectRatio = "1:1";
        if (aspectRatio === "1024x1792" || aspectRatio === "9:16") finalAspectRatio = "9:16";
        else if (aspectRatio === "1792x1024" || aspectRatio === "16:9") finalAspectRatio = "16:9";
        else if (aspectRatio === "4:3") finalAspectRatio = "4:3";
        else if (aspectRatio === "3:4") finalAspectRatio = "3:4";
        else finalAspectRatio = "1:1";

        const imageUrls = await performBatchGeneration(prompt, model, finalAspectRatio, numImages, logger);

        if (imageUrls.length === 0) {
            throw new Error("All image generations failed");
        }

        const respContent = imageUrls.map((url, idx) => 
            `![Generated Image ${idx + 1}](${url})`
        ).join('\n\n');
        
        const respId = `chatcmpl-${crypto.randomUUID()}`;

        if (body.stream) {
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();

            (async () => {
                if (isWebUI) {
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ debug: logger.get() })}\n\n`));
                }

                const chunk = {
                    id: respId, 
                    object: 'chat.completion.chunk', 
                    created: Math.floor(Date.now()/1000),
                    model: model, 
                    choices: [{ 
                        index: 0, 
                        delta: { content: respContent }, 
                        finish_reason: null 
                    }]
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                
                const endChunk = {
                    id: respId, 
                    object: 'chat.completion.chunk', 
                    created: Math.floor(Date.now()/1000),
                    model: model, 
                    choices: [{ 
                        index: 0, 
                        delta: {}, 
                        finish_reason: 'stop' 
                    }]
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(endChunk)}\n\n`));
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                await writer.close();
            })();

            return new Response(readable, {
                headers: corsHeaders({ 'Content-Type': 'text/event-stream' })
            });
        } else {
            return new Response(JSON.stringify({
                id: respId,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                    index: 0,
                    message: { role: "assistant", content: respContent },
                    finish_reason: "stop"
                }]
            }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
        }

    } catch (e) {
        logger.add("Fatal Error", e.message);
        return createErrorResponse(e.message, 500, 'generation_failed');
    }
}

/**
 * 处理 Image 接口
 */
async function handleImageGenerations(request, apiKey) {
    const logger = new Logger();
    if (!verifyAuth(request, apiKey)) return createErrorResponse('Unauthorized', 401, 'unauthorized');

    try {
        const body = await request.json();
        const prompt = body.prompt;
        
        // 支持模型选择
        const requestedModel = body.model || CONFIG.DEFAULT_MODEL;
        const model = CONFIG.MODELS.includes(requestedModel) ? requestedModel : CONFIG.DEFAULT_MODEL;
        
        let size = "1:1";
        if (body.size === "1024x1792") size = "9:16";
        else if (body.size === "1792x1024") size = "16:9";
        else size = "1:1";

        const numImages = Math.min(
            Math.max(1, body.n || CONFIG.DEFAULT_NUM_IMAGES), 
            CONFIG.MAX_IMAGES
        );

        const imageUrls = await performBatchGeneration(prompt, model, size, numImages, logger);

        return new Response(JSON.stringify({
            created: Math.floor(Date.now() / 1000),
            data: imageUrls.map(url => ({ url }))
        }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });

    } catch (e) {
        return createErrorResponse(e.message, 500, 'generation_failed');
    }
}

// --- [辅助函数] ---

function verifyAuth(request, validKey) {
    if (validKey === "1") return true; 
    const auth = request.headers.get('Authorization');
    return auth && auth === `Bearer ${validKey}`;
}

function createErrorResponse(message, status, code) {
    return new Response(JSON.stringify({
        error: { message, type: 'api_error', code }
    }), { status, headers: corsHeaders({ 'Content-Type': 'application/json' }) });
}

function handleCorsPreflight() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(headers = {}) {
    return {
        ...headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

function handleModelsRequest() {
    return new Response(JSON.stringify({
        object: 'list',
        data: CONFIG.MODELS.map(id => ({
            id,
            object: 'model',
            created: Date.now(),
            owned_by: 'ai-generator',
            ...CONFIG.MODEL_CONFIGS[id]
        }))
    }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
}

// --- [第四部分: Web UI] ---
function handleUI(request, apiKey) {
  const origin = new URL(request.url).origin;
  
  // 生成模型选项 HTML
  const modelOptions = CONFIG.MODELS.map(modelId => {
    const config = CONFIG.MODEL_CONFIGS[modelId];
    const isDefault = modelId === CONFIG.DEFAULT_MODEL;
    return `<option value="${modelId}" ${isDefault ? 'selected' : ''}>${config.displayName} - ${config.description}</option>`;
  }).join('\n');
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CONFIG.PROJECT_NAME} v${CONFIG.PROJECT_VERSION}</title>
    <style>
      :root { --bg: #09090b; --panel: #18181b; --border: #27272a; --text: #e4e4e7; --primary: #f59e0b; --accent: #3b82f6; --code-bg: #000000; }
      body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; height: 100vh; display: flex; overflow: hidden; }
      .sidebar { width: 360px; background: var(--panel); border-right: 1px solid var(--border); padding: 24px; display: flex; flex-direction: column; overflow-y: auto; }
      .main { flex: 1; display: flex; flex-direction: column; padding: 24px; background-color: #000; }
      h2 { margin-top: 0; font-size: 20px; color: #fff; display: flex; align-items: center; gap: 10px; }
      .badge { background: var(--primary); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
      .box { background: #27272a; padding: 16px; border-radius: 8px; border: 1px solid #3f3f46; margin-bottom: 20px; }
      .label { font-size: 12px; color: #a1a1aa; margin-bottom: 8px; display: block; font-weight: 600; }
      .code-block { font-family: 'Consolas', monospace; font-size: 12px; color: var(--primary); background: #111; padding: 10px; border-radius: 6px; cursor: pointer; word-break: break-all; border: 1px solid #333; transition: 0.2s; }
      .code-block:hover { border-color: var(--primary); background: #1a1a1a; }
      input, select, textarea { width: 100%; background: #18181b; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 12px; box-sizing: border-box; transition: 0.2s; }
      input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; }
      button { width: 100%; padding: 12px; background: var(--primary); border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: #000; font-size: 14px; transition: 0.2s; }
      button:hover { filter: brightness(1.1); }
      button:disabled { background: #3f3f46; color: #71717a; cursor: not-allowed; }
      .result-area { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; background: radial-gradient(circle, #1a1a1a, #000); border-radius: 12px; border: 1px solid var(--border); padding: 20px; }
      .result-img { width: 100%; height: auto; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.7); cursor: pointer; transition: transform 0.3s; }
      .result-img:hover { transform: scale(1.02); }
      .image-grid { display: flex; flex-wrap: wrap; gap: 16px; width: 100%; justify-content: center; }
      .image-item { flex: 1; min-width: 300px; max-width: 48%; }
      .image-label { text-align: center; color: #71717a; margin-top: 8px; font-size: 12px; }
      .status-bar { height: 30px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #71717a; margin-top: 12px; }
      .spinner { width: 24px; height: 24px; border: 3px solid #333; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; display: none; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .log-panel { height: 200px; background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow-y: auto; font-family: 'Consolas', monospace; font-size: 11px; color: #a1a1aa; margin-top: 10px; }
      .log-entry { margin-bottom: 8px; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px; }
      .log-time { color: #52525b; margin-right: 8px; }
      .log-key { color: var(--accent); font-weight: bold; margin-right: 8px; }
      .log-json { color: #86efac; white-space: pre-wrap; display: block; margin-top: 4px; padding-left: 10px; border-left: 2px solid #333; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>🎨 Multi-Model <span class="badge">v${CONFIG.PROJECT_VERSION}</span></h2>
        
        <div class="box">
            <span class="label">API 密钥</span>
            <div class="code-block" onclick="copy('${apiKey}')">${apiKey}</div>
        </div>

        <div class="box">
            <span class="label">API 地址</span>
            <div class="code-block" onclick="copy('${origin}/v1/chat/completions')">${origin}/v1/chat/completions</div>
        </div>

        <div class="box">
            <span class="label">🤖 AI 模型</span>
            <select id="model">
                ${modelOptions}
            </select>
            
            <span class="label">🖼️ 生成数量</span>
            <select id="num-images">
                <option value="1" selected>1 张</option>
                <option value="2">2 张</option>
                <option value="3">3 张</option>
                <option value="4">4 张</option>
            </select>
            
            <span class="label">📊 图片比例</span>
            <select id="ratio">
                <option value="1:1" selected>1:1 (方形)</option>
                <option value="16:9">16:9 (横屏)</option>
                <option value="9:16">9:16 (竖屏)</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
            </select>

            <span class="label">✨ 提示词</span>
            <textarea id="prompt" rows="6" placeholder="描述你想生成的图片...\n\n例如: A futuristic city with neon lights, cyberpunk style"></textarea>
            
            <button id="btn-gen" onclick="generate()">🚀 开始生成</button>
        </div>
    </div>

    <main class="main">
        <div class="result-area" id="result-container">
            <div style="color:#3f3f46; text-align:center;">
                <p style="font-size: 16px;">📸 图片预览区域</p>
                <p style="font-size: 12px;">支持 ${CONFIG.MODELS.length} 个 AI 模型 · 最多生成 ${CONFIG.MAX_IMAGES} 张图片</p>
                <div class="spinner" id="spinner"></div>
            </div>
        </div>
        
        <div class="status-bar">
            <span id="status-text">系统就绪 · ${CONFIG.MODELS.length} 个模型可用</span>
            <span id="time-text"></span>
        </div>

        <div class="log-panel" id="logs">
            <div style="color:#52525b">// 等待请求...</div>
        </div>
    </main>

    <script>
        const API_KEY = "${apiKey}";
        const ENDPOINT = "${origin}/v1/chat/completions";
        const MODEL_CONFIGS = ${JSON.stringify(CONFIG.MODEL_CONFIGS)};

        function copy(text) { navigator.clipboard.writeText(text); alert('已复制'); }

        function appendLog(step, data) {
            const logs = document.getElementById('logs');
            const div = document.createElement('div');
            div.className = 'log-entry';
            const time = new Date().toLocaleTimeString();
            let content = typeof data === 'object' ? \`<span class="log-json">\${JSON.stringify(data, null, 2)}</span>\` : \`<span style="color:#e4e4e7">\${data}</span>\`;
            div.innerHTML = \`<span class="log-time">[\${time}]</span><span class="log-key">\${step}</span>\${content}\`;
            if (logs.innerText.includes('//')) logs.innerHTML = '';
            logs.appendChild(div);
            logs.scrollTop = logs.scrollHeight;
        }

        async function generate() {
            const prompt = document.getElementById('prompt').value.trim();
            if (!prompt) return alert('请输入提示词');

            const model = document.getElementById('model').value;
            const numImages = parseInt(document.getElementById('num-images').value) || 1;
            const aspectRatio = document.getElementById('ratio').value;

            const btn = document.getElementById('btn-gen');
            const spinner = document.getElementById('spinner');
            const status = document.getElementById('status-text');
            const container = document.getElementById('result-container');
            const timeText = document.getElementById('time-text');

            const modelConfig = MODEL_CONFIGS[model];
            if(btn) { btn.disabled = true; btn.innerText = \`生成 \${numImages} 张中...\`; }
            if(spinner) spinner.style.display = 'inline-block';
            if(status) status.innerText = \`正在使用 \${modelConfig.displayName} 生成...\`;
            if(container) container.innerHTML = '<div class="spinner" style="display:block"></div>';

            const startTime = Date.now();

            try {
                const payload = {
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                    stream: true,
                    is_web_ui: true,
                    n: numImages,
                    aspect_ratio: aspectRatio
                };

                appendLog("System", \`Using model: \${modelConfig.displayName}\`);

                const res = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error?.message || \`HTTP \${res.status}\`);
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullContent = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') break;
                            try {
                                const json = JSON.parse(jsonStr);
                                if (json.debug) {
                                    json.debug.forEach(log => appendLog(log.step, log.data));
                                    continue;
                                }
                                if (json.choices && json.choices[0].delta.content) {
                                    fullContent += json.choices[0].delta.content;
                                }
                            } catch (e) {}
                        }
                    }
                }

                const urlRegex = /\\!\\[.*?\\]\\((.*?)\\)/g;
                const matches = [...fullContent.matchAll(urlRegex)];
                
                if (matches.length > 0) {
                    const imageUrls = matches.map(m => m[1]);
                    const gridHtml = imageUrls.map((url, idx) => 
                        \`<div class="image-item">
                            <img src="\${url}" class="result-img" onclick="window.open(this.src)">
                            <div class="image-label">图片 \${idx + 1} / \${imageUrls.length}</div>
                        </div>\`
                    ).join('');
                    
                    if(container) container.innerHTML = \`<div class="image-grid">\${gridHtml}</div>\`;
                    if(status) status.innerText = \`✅ \${modelConfig.displayName} 成功生成 \${imageUrls.length} 张\`;
                    if(timeText) timeText.innerText = \`耗时: \${((Date.now()-startTime)/1000).toFixed(2)}s\`;
                    appendLog("Success", \`Generated \${imageUrls.length} images\`);
                } else {
                    throw new Error("无法提取图片 URL");
                }

            } catch (e) {
                if(container) container.innerHTML = \`<div style="color:#ef4444; padding:20px; text-align:center">❌ \${e.message}</div>\`;
                if(status) status.innerText = "❌ 错误";
                appendLog("Error", e.message);
            } finally {
                if(btn) { btn.disabled = false; btn.innerText = "🚀 开始生成"; }
            }
        }
    </script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}