// =================================================================================
//  項目: ai-generator-2api (Cloudflare Worker 單文件版)
//  版本: 2.8.0 (代號: Pollinations Freedom Edition)
//  作者: 首席AI執行官
//  日期: 2025-11-28
//
//  [v2.8.0 變更日誌]
//  1. [新增] Pollinations.ai 免費 API 支持
//  2. [新增] 3 個 Pollinations 模型: flux, turbo, flux-realism
//  3. [增強] 雙 provider 路由系統 (付費/免費)
//  4. [優化] Pollinations 模型無需積分扣除
//  5. [保留] 所有現有功能完整支持
// =================================================================================

// --- [第一部分: 核心配置] ---
const CONFIG = {
  PROJECT_NAME: "ai-generator-multi-model",
  PROJECT_VERSION: "2.8.0",
  
  API_MASTER_KEY: "1", 
  
  UPSTREAM_ORIGIN: "https://ai-image-generator.co",
  POLLINATIONS_ORIGIN: "https://image.pollinations.ai",
  
  // 內容安全配置
  SAFETY_CONFIG: {
    enableNSFW: true,
    requireAgeVerification: true,
    minAge: 18,
    logNSFWRequests: true,
  },
  
  MODELS: [
    // Pollinations 免費模型
    "pollinations-flux",
    "pollinations-turbo",
    "pollinations-flux-realism",
    // 原有付費模型
    "flux-schnell",
    "flux-dev",
    "flux-pro",
    "flux-1.1-pro",
    "stable-diffusion-xl",
    "stable-diffusion-3",
    "dall-e-3"
  ],
  
  DEFAULT_MODEL: "pollinations-flux",
  
  MODEL_CONFIGS: {
    // === Pollinations.ai 免費模型 ===
    "pollinations-flux": {
      displayName: "Pollinations Flux",
      provider: "pollinations",
      upstreamModel: "flux",
      credits: 0,  // 完全免費!
      speed: "fast",
      quality: "excellent",
      description: "免費 Flux 模型,高質量快速生成",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true
    },
    "pollinations-turbo": {
      displayName: "Pollinations Turbo",
      provider: "pollinations",
      upstreamModel: "turbo",
      credits: 0,
      speed: "very-fast",
      quality: "good",
      description: "免費超快速模型,適合快速迭代",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true
    },
    "pollinations-flux-realism": {
      displayName: "Pollinations Flux Realism",
      provider: "pollinations",
      upstreamModel: "flux-realism",
      credits: 0,
      speed: "medium",
      quality: "excellent",
      description: "免費寫實風格模型,照片級質量",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true
    },
    // === 原有付費模型 ===
    "flux-schnell": {
      displayName: "Flux Schnell",
      provider: "replicate",
      credits: 1,
      speed: "fast",
      quality: "good",
      description: "快速生成,適合快速迭代",
      maxImages: 4,
      supportsNSFW: true,
      isFree: false
    },
    "flux-dev": {
      displayName: "Flux Dev",
      provider: "replicate",
      credits: 2,
      speed: "medium",
      quality: "excellent",
      description: "開發版本,高質量輸出",
      maxImages: 4,
      supportsNSFW: true,
      isFree: false
    },
    "flux-pro": {
      displayName: "Flux Pro",
      provider: "replicate",
      credits: 5,
      speed: "slow",
      quality: "best",
      description: "專業版本,最高質量(僅單張)",
      maxImages: 1,
      supportsNSFW: true,
      isFree: false
    },
    "flux-1.1-pro": {
      displayName: "Flux 1.1 Pro",
      provider: "replicate",
      credits: 6,
      speed: "slow",
      quality: "best",
      description: "2025最新版本(僅單張)",
      maxImages: 1,
      supportsNSFW: true,
      isFree: false
    },
    "stable-diffusion-xl": {
      displayName: "Stable Diffusion XL",
      provider: "stability",
      credits: 2,
      speed: "medium",
      quality: "excellent",
      description: "開源經典模型",
      maxImages: 4,
      supportsNSFW: true,
      isFree: false
    },
    "stable-diffusion-3": {
      displayName: "Stable Diffusion 3",
      provider: "stability",
      credits: 3,
      speed: "medium",
      quality: "excellent",
      description: "SD3 最新版本",
      maxImages: 4,
      supportsNSFW: true,
      isFree: false
    },
    "dall-e-3": {
      displayName: "DALL-E 3",
      provider: "openai",
      credits: 4,
      speed: "medium",
      quality: "excellent",
      description: "OpenAI 官方模型(僅單張)",
      maxImages: 1,
      supportsNSFW: false,
      isFree: false
    }
  },
  
  MAX_IMAGES: 4,
  DEFAULT_NUM_IMAGES: 1,
};

// --- [第二部分: Worker 入口路由] ---
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
    
    return createErrorResponse(`Endpoint not found: ${url.pathname}`, 404, 'not_found');
  }
};

// --- [第三部分: 核心業務邏輯] ---

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
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-Forwarded-For": fakeIP,
            "X-Real-IP": fakeIP,
            "CF-Connecting-IP": fakeIP,
            "Cookie": `anon_user_id=${anonUserId};`
        },
        fakeIP: fakeIP
    };
}

function getModelConfig(model) {
    return CONFIG.MODEL_CONFIGS[model] || CONFIG.MODEL_CONFIGS[CONFIG.DEFAULT_MODEL];
}

/**
 * 轉換比例格式給 Pollinations
 */
function convertAspectRatioForPollinations(aspectRatio) {
    const ratioMap = {
        "1:1": { width: 1024, height: 1024 },
        "16:9": { width: 1920, height: 1080 },
        "9:16": { width: 1080, height: 1920 },
        "4:3": { width: 1024, height: 768 },
        "3:4": { width: 768, height: 1024 }
    };
    return ratioMap[aspectRatio] || { width: 1024, height: 1024 };
}

/**
 * Pollinations.ai 圖片生成
 */
async function performPollinationsGeneration(prompt, model, aspectRatio, logger, index = 0, safeMode = true) {
    const modelConfig = getModelConfig(model);
    const logPrefix = index > 0 ? `[Image ${index+1}]` : "";
    const dimensions = convertAspectRatioForPollinations(aspectRatio);
    
    logger.add(`${logPrefix}Pollinations Request`, {
        provider: "pollinations",
        model: modelConfig.upstreamModel,
        prompt: prompt.substring(0, 50) + "...",
        dimensions: dimensions,
        safeMode: safeMode,
        isFree: true
    });

    // 構建 URL 參數
    const params = new URLSearchParams({
        model: modelConfig.upstreamModel,
        width: dimensions.width.toString(),
        height: dimensions.height.toString(),
        nologo: "true",
        enhance: safeMode ? "false" : "true",
        nofeed: "true"
    });
    
    // Pollinations.ai 的 GET 請求格式
    const imageUrl = `${CONFIG.POLLINATIONS_ORIGIN}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    
    logger.add(`${logPrefix}Pollinations URL`, imageUrl);
    
    try {
        // 驗證圖片是否可訪問
        const response = await fetch(imageUrl, { method: 'HEAD' });
        
        if (response.ok) {
            logger.add(`${logPrefix}Pollinations Success`, {
                status: response.status,
                url: imageUrl
            });
            return imageUrl;
        } else {
            throw new Error(`Pollinations returned ${response.status}`);
        }
    } catch (e) {
        logger.add(`${logPrefix}Pollinations Error`, e.message);
        throw e;
    }
}

/**
 * 上游付費服務生成
 */
async function performUpstreamGeneration(prompt, model, aspectRatio, logger, index = 0, safeMode = true) {
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

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    formData.append("num_outputs", "1");
    formData.append("inputMode", "text");
    
    if (safeMode) {
        formData.append("style", "auto");
        formData.append("safe_mode", "true");
    } else {
        formData.append("style", "none");
        formData.append("safe_mode", "false");
    }
    
    formData.append("aspectRatio", aspectRatio || "1:1");
    formData.append("fingerprint_id", fingerprint);
    formData.append("provider", modelConfig.provider);

    const genHeaders = { ...headers };
    delete genHeaders["content-type"]; 

    logger.add(`${logPrefix}Generation Request`, {
        url: `${CONFIG.UPSTREAM_ORIGIN}/api/gen-image`,
        provider: modelConfig.provider,
        model: model,
        safeMode: safeMode
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
 * 批量生成多張圖片(智能路由)
 */
async function performBatchGeneration(prompt, model, aspectRatio, numImages, logger, safeMode = true) {
    const modelConfig = getModelConfig(model);
    const modelMaxImages = modelConfig.maxImages || 1;
    const count = Math.min(Math.max(1, numImages), modelMaxImages, CONFIG.MAX_IMAGES);
    
    if (numImages > modelMaxImages) {
        logger.add("Model Limitation", { 
            requestedImages: numImages,
            modelMaxImages: modelMaxImages,
            model: model,
            message: `${modelConfig.displayName} 最多支持 ${modelMaxImages} 張圖片`
        });
    }
    
    logger.add("Batch Generation Start", { 
        requestedImages: numImages, 
        actualImages: count,
        model: model,
        provider: modelConfig.provider,
        isFree: modelConfig.isFree,
        safeMode: safeMode,
        prompt: prompt.substring(0, 80) + "..."
    });

    const promises = [];
    for (let i = 0; i < count; i++) {
        // 根據 provider 選擇生成函數
        if (modelConfig.provider === "pollinations") {
            promises.push(
                performPollinationsGeneration(prompt, model, aspectRatio, logger, i, safeMode)
                    .catch(err => {
                        logger.add(`Image ${i+1} Failed`, err.message);
                        return null;
                    })
            );
        } else {
            promises.push(
                performUpstreamGeneration(prompt, model, aspectRatio, logger, i, safeMode)
                    .catch(err => {
                        logger.add(`Image ${i+1} Failed`, err.message);
                        return null;
                    })
            );
        }
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
                if (part.type === 'text') prompt += part.text + " ";
            }
        }

        const requestedModel = body.model || CONFIG.DEFAULT_MODEL;
        const model = CONFIG.MODELS.includes(requestedModel) ? requestedModel : CONFIG.DEFAULT_MODEL;
        const modelConfig = getModelConfig(model);
        const safeMode = body.safe_mode !== false;
        
        if (!safeMode && !modelConfig.supportsNSFW) {
            throw new Error(`模型 ${modelConfig.displayName} 不支持 NSFW 內容`);
        }
        
        if (!safeMode && CONFIG.SAFETY_CONFIG.logNSFWRequests) {
            logger.add("NSFW Request", {
                model: model,
                provider: modelConfig.provider,
                timestamp: new Date().toISOString()
            });
        }
        
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

        const imageUrls = await performBatchGeneration(prompt, model, finalAspectRatio, numImages, logger, safeMode);

        if (imageUrls.length === 0) throw new Error("All image generations failed");

        const respContent = imageUrls.map((url, idx) => `![Generated Image ${idx + 1}](${url})`).join('\n\n');
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
                    choices: [{ index: 0, delta: { content: respContent }, finish_reason: null }]
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                
                const endChunk = {
                    id: respId, 
                    object: 'chat.completion.chunk', 
                    created: Math.floor(Date.now()/1000),
                    model: model, 
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
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

async function handleImageGenerations(request, apiKey) {
    const logger = new Logger();
    if (!verifyAuth(request, apiKey)) return createErrorResponse('Unauthorized', 401, 'unauthorized');

    try {
        const body = await request.json();
        const prompt = body.prompt;
        const requestedModel = body.model || CONFIG.DEFAULT_MODEL;
        const model = CONFIG.MODELS.includes(requestedModel) ? requestedModel : CONFIG.DEFAULT_MODEL;
        const modelConfig = getModelConfig(model);
        const safeMode = body.safe_mode !== false;
        
        if (!safeMode && !modelConfig.supportsNSFW) {
            return createErrorResponse(`模型 ${modelConfig.displayName} 不支持 NSFW 內容`, 400, 'unsupported_content');
        }
        
        let size = "1:1";
        if (body.size === "1024x1792") size = "9:16";
        else if (body.size === "1792x1024") size = "16:9";
        else size = "1:1";

        const numImages = Math.min(Math.max(1, body.n || CONFIG.DEFAULT_NUM_IMAGES), CONFIG.MAX_IMAGES);
        const imageUrls = await performBatchGeneration(prompt, model, size, numImages, logger, safeMode);

        return new Response(JSON.stringify({
            created: Math.floor(Date.now() / 1000),
            data: imageUrls.map(url => ({ url }))
        }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });

    } catch (e) {
        return createErrorResponse(e.message, 500, 'generation_failed');
    }
}

// --- [輔助函數] ---

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

function handleAgeVerification(request) {
    const url = new URL(request.url);
    const verified = url.searchParams.get('verified') === 'true';
    
    if (verified) {
        return new Response(null, {
            status: 302,
            headers: {
                'Location': '/',
                'Set-Cookie': 'age_verified=true; Max-Age=86400; Path=/; SameSite=Strict'
            }
        });
    }
    
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>年齡驗證 - AI Generator</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #09090b; color: #e4e4e7; margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .container { max-width: 500px; padding: 40px; background: #18181b; border-radius: 12px; border: 1px solid #27272a; text-align: center; }
        h1 { color: #f59e0b; margin-bottom: 20px; }
        .warning { background: #7f1d1d; color: #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .terms { text-align: left; font-size: 14px; color: #a1a1aa; margin: 20px 0; max-height: 200px; overflow-y: auto; padding: 15px; background: #000; border-radius: 6px; }
        button { padding: 12px 24px; background: #f59e0b; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: #000; font-size: 14px; margin: 10px; }
        button:hover { filter: brightness(1.1); }
        .decline { background: #3f3f46; color: #e4e4e7; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔞 年齡驗證</h1>
        <div class="warning">
            <strong>⚠️ 成人內容警告</strong><br>
            本服務包含藝術創作功能,可能生成成人內容。
        </div>
        <div class="terms">
            <strong>使用條款:</strong><br><br>
            1. 我已年滿 18 歲(或當地法定成年年齡)<br>
            2. 我理解並同意僅將此工具用於合法的藝術創作目的<br>
            3. 我承諾不會生成任何涉及未成年人、非自願參與者或非法內容的圖像<br>
            4. 我理解生成的內容需遵守當地法律法規<br>
            5. 我同意對自己生成的內容負全部責任<br><br>
            <strong>禁止內容:</strong><br>
            - 涉及未成年人的任何內容<br>
            - 非自願的色情內容<br>
            - 暴力、仇恨或非法內容<br>
            - 侵犯他人權利的內容
        </div>
        <p style="font-size: 16px; margin: 20px 0;">您是否已年滿 18 歲並同意以上條款?</p>
        <button onclick="verify()">✓ 是的,我已年滿 18 歲</button>
        <button class="decline" onclick="decline()">✗ 否,我未滿 18 歲</button>
    </div>
    <script>
        function verify() {
            document.cookie = 'age_verified=true; max-age=86400; path=/; SameSite=Strict';
            window.location.href = '/';
        }
        function decline() {
            alert('您必須年滿 18 歲才能使用本服務。');
            window.location.href = 'https://www.google.com';
        }
    </script>
</body>
</html>`;
    
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// --- [第四部分: Web UI] ---
function handleUI(request, apiKey) {
  const origin = new URL(request.url).origin;
  const cookies = request.headers.get('Cookie') || '';
  const ageVerified = cookies.includes('age_verified=true');
  
  if (CONFIG.SAFETY_CONFIG.requireAgeVerification && !ageVerified) {
    return new Response(null, { status: 302, headers: { 'Location': '/age-verify' } });
  }
  
  // 按 provider 分組模型選項
  const freeModels = CONFIG.MODELS.filter(id => CONFIG.MODEL_CONFIGS[id].isFree);
  const paidModels = CONFIG.MODELS.filter(id => !CONFIG.MODEL_CONFIGS[id].isFree);
  
  const modelOptionsHTML = `
    <optgroup label="🆓 免費模型 (Pollinations.ai)">
      ${freeModels.map(id => {
        const config = CONFIG.MODEL_CONFIGS[id];
        const isDefault = id === CONFIG.DEFAULT_MODEL;
        return `<option value="${id}" ${isDefault ? 'selected' : ''}>${config.displayName} - ${config.description}</option>`;
      }).join('\n')}
    </optgroup>
    <optgroup label="💎 付費模型 (Premium)">
      ${paidModels.map(id => {
        const config = CONFIG.MODEL_CONFIGS[id];
        const nsfwTag = config.supportsNSFW ? '' : ' [僅安全]';
        return `<option value="${id}">${config.displayName}${nsfwTag} - ${config.description} (${config.credits}學分)</option>`;
      }).join('\n')}
    </optgroup>
  `;
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CONFIG.PROJECT_NAME} v${CONFIG.PROJECT_VERSION}</title>
    <style>
      :root { --bg: #09090b; --panel: #18181b; --border: #27272a; --text: #e4e4e7; --primary: #f59e0b; --accent: #3b82f6; --code-bg: #000000; --success: #10b981; }
      body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; height: 100vh; display: flex; overflow: hidden; }
      .sidebar { width: 360px; background: var(--panel); border-right: 1px solid var(--border); padding: 24px; display: flex; flex-direction: column; overflow-y: auto; }
      .main { flex: 1; display: flex; flex-direction: column; padding: 24px; background-color: #000; }
      h2 { margin-top: 0; font-size: 20px; color: #fff; display: flex; align-items: center; gap: 10px; }
      .badge { background: var(--primary); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
      .badge-free { background: var(--success); color: #fff; }
      .box { background: #27272a; padding: 16px; border-radius: 8px; border: 1px solid #3f3f46; margin-bottom: 20px; }
      .warning-box { background: #7f1d1d; border-color: #991b1b; padding: 12px; margin-bottom: 16px; border-radius: 6px; font-size: 12px; color: #fecaca; }
      .info-box { background: #064e3b; border: 1px solid #059669; padding: 12px; margin-bottom: 16px; border-radius: 6px; font-size: 12px; color: #6ee7b7; }
      .label { font-size: 12px; color: #a1a1aa; margin-bottom: 8px; display: block; font-weight: 600; }
      .warning { font-size: 11px; color: #fbbf24; margin-top: -8px; margin-bottom: 12px; display: none; }
      .code-block { font-family: 'Consolas', monospace; font-size: 12px; color: var(--primary); background: #111; padding: 10px; border-radius: 6px; cursor: pointer; word-break: break-all; border: 1px solid #333; transition: 0.2s; }
      .code-block:hover { border-color: var(--primary); background: #1a1a1a; }
      input, select, textarea { width: 100%; background: #18181b; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px; margin-bottom: 12px; box-sizing: border-box; transition: 0.2s; }
      input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; }
      input[type="checkbox"] { width: auto; margin-right: 8px; }
      .checkbox-label { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; cursor: pointer; }
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
        
        <div class="info-box">
            🆓 <strong>新增免費模型!</strong><br>
            Pollinations.ai 提供完全免費的 AI 生成服務
        </div>
        
        <div class="warning-box">
            🔞 <strong>18+ 內容警告</strong><br>
            本工具支持藝術創作模式。請負責任地使用。
        </div>
        
        <div class="box">
            <span class="label">API 密鑰</span>
            <div class="code-block" onclick="copy('${apiKey}')">${apiKey}</div>
        </div>

        <div class="box">
            <span class="label">API 地址</span>
            <div class="code-block" onclick="copy('${origin}/v1/chat/completions')">${origin}/v1/chat/completions</div>
        </div>

        <div class="box">
            <span class="label">🤖 AI 模型</span>
            <select id="model" onchange="updateModelInfo()">
                ${modelOptionsHTML}
            </select>
            <div id="model-info" style="font-size: 11px; color: #10b981; margin-top: -8px; margin-bottom: 12px;"></div>
            
            <span class="label">🖼️ 生成數量</span>
            <select id="num-images">
                <option value="1" selected>1 張</option>
                <option value="2">2 張</option>
                <option value="3">3 張</option>
                <option value="4">4 張</option>
            </select>
            <div class="warning" id="model-warning">⚠️ 當前模型僅支持單張生成</div>
            
            <span class="label">📊 圖片比例</span>
            <select id="ratio">
                <option value="1:1" selected>1:1 (方形)</option>
                <option value="16:9">16:9 (橫屏)</option>
                <option value="9:16">9:16 (豎屏)</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
            </select>
            
            <label class="checkbox-label">
                <input type="checkbox" id="safe-mode" checked onchange="updateSafeMode()">
                🛡️ 安全模式 (推薦)
            </label>
            <div class="warning" id="nsfw-warning" style="display:none; color:#dc2626;">⚠️ 已關閉安全模式 - 請負責任使用</div>

            <span class="label">✨ 提示詞</span>
            <textarea id="prompt" rows="6" placeholder="描述你想生成的圖片...\n\n例如: A futuristic city with neon lights, cyberpunk style"></textarea>
            
            <button id="btn-gen" onclick="generate()">🚀 開始生成</button>
        </div>
    </div>

    <main class="main">
        <div class="result-area" id="result-container">
            <div style="color:#3f3f46; text-align:center;">
                <p style="font-size: 16px;">📸 圖片預覽區域</p>
                <p style="font-size: 12px;">支持 ${CONFIG.MODELS.length} 個 AI 模型 · 包含 Pollinations 免費模型 · 最多生成 ${CONFIG.MAX_IMAGES} 張圖片</p>
                <div class="spinner" id="spinner"></div>
            </div>
        </div>
        
        <div class="status-bar">
            <span id="status-text">系統就緒 · ${CONFIG.MODELS.length} 個模型可用 (含 ${freeModels.length} 個免費)</span>
            <span id="time-text"></span>
        </div>

        <div class="log-panel" id="logs">
            <div style="color:#52525b">// 等待請求...</div>
        </div>
    </main>

    <script>
        const API_KEY = "${apiKey}";
        const ENDPOINT = "${origin}/v1/chat/completions";
        const MODEL_CONFIGS = ${JSON.stringify(CONFIG.MODEL_CONFIGS)};

        function copy(text) { navigator.clipboard.writeText(text); alert('已複製'); }

        function updateModelInfo() {
            const model = document.getElementById('model').value;
            const modelConfig = MODEL_CONFIGS[model];
            const infoDiv = document.getElementById('model-info');
            
            if (modelConfig.isFree) {
                infoDiv.innerHTML = '✨ 完全免費 · 無需積分';
                infoDiv.style.color = '#10b981';
            } else {
                infoDiv.innerHTML = \`💳 消耗 \${modelConfig.credits} 學分/張\`;
                infoDiv.style.color = '#fbbf24';
            }
            
            updateImageOptions();
        }

        function updateSafeMode() {
            const safeMode = document.getElementById('safe-mode').checked;
            const warning = document.getElementById('nsfw-warning');
            const model = document.getElementById('model').value;
            const modelConfig = MODEL_CONFIGS[model];
            
            if (!safeMode) {
                if (!modelConfig.supportsNSFW) {
                    alert('當前模型不支持關閉安全模式');
                    document.getElementById('safe-mode').checked = true;
                    return;
                }
                warning.style.display = 'block';
            } else {
                warning.style.display = 'none';
            }
        }

        function updateImageOptions() {
            const model = document.getElementById('model').value;
            const numImagesSelect = document.getElementById('num-images');
            const warning = document.getElementById('model-warning');
            const modelConfig = MODEL_CONFIGS[model];
            const maxImages = modelConfig.maxImages || 4;
            
            numImagesSelect.innerHTML = '';
            for (let i = 1; i <= maxImages; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.text = i + ' 張';
                if (i === 1) option.selected = true;
                numImagesSelect.appendChild(option);
            }
            
            warning.style.display = maxImages === 1 ? 'block' : 'none';
            updateSafeMode();
        }
        
        updateModelInfo();

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
            if (!prompt) return alert('請輸入提示詞');

            const model = document.getElementById('model').value;
            const numImages = parseInt(document.getElementById('num-images').value) || 1;
            const aspectRatio = document.getElementById('ratio').value;
            const safeMode = document.getElementById('safe-mode').checked;
            const modelConfig = MODEL_CONFIGS[model];
            const modeText = safeMode ? '安全模式' : '🔞 藝術模式';
            const costText = modelConfig.isFree ? '免費' : \`\${modelConfig.credits * numImages}學分\`;
            
            const btn = document.getElementById('btn-gen');
            const spinner = document.getElementById('spinner');
            const status = document.getElementById('status-text');
            const container = document.getElementById('result-container');
            const timeText = document.getElementById('time-text');
            
            if(btn) { btn.disabled = true; btn.innerText = \`生成 \${numImages} 張中...\`; }
            if(spinner) spinner.style.display = 'inline-block';
            if(status) status.innerText = \`正在使用 \${modelConfig.displayName} (\${modeText}, \${costText})...\`;
            if(container) container.innerHTML = '<div class="spinner" style="display:block"></div>';

            const startTime = Date.now();

            try {
                const payload = {
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                    stream: true,
                    is_web_ui: true,
                    n: numImages,
                    aspect_ratio: aspectRatio,
                    safe_mode: safeMode
                };

                appendLog("System", \`Using \${modelConfig.displayName} | Provider: \${modelConfig.provider} | Free: \${modelConfig.isFree} | Mode: \${modeText}\`);

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
                            <div class="image-label">圖片 \${idx + 1} / \${imageUrls.length}</div>
                        </div>\`
                    ).join('');
                    
                    if(container) container.innerHTML = \`<div class="image-grid">\${gridHtml}</div>\`;
                    if(status) status.innerText = \`✅ \${modelConfig.displayName} (\${modeText}) 成功生成 \${imageUrls.length} 張 | \${costText}\`;
                    if(timeText) timeText.innerText = \`耗時: \${((Date.now()-startTime)/1000).toFixed(2)}s\`;
                    appendLog("Success", \`Generated \${imageUrls.length} images\`);
                } else {
                    throw new Error("無法提取圖片 URL");
                }

            } catch (e) {
                if(container) container.innerHTML = \`<div style="color:#ef4444; padding:20px; text-align:center">❌ \${e.message}</div>\`;
                if(status) status.innerText = "❌ 錯誤";
                appendLog("Error", e.message);
            } finally {
                if(btn) { btn.disabled = false; btn.innerText = "🚀 開始生成"; }
            }
        }
    </script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}