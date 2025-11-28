// =================================================================================
//  項目: ai-generator-2api (Cloudflare Worker 單文件版)
//  版本: 2.13.0 (代號: API Provider Selector)
//  作者: 首席AI執行官
//  日期: 2025-11-28
//
//  [v2.13.0 變更日誌]
//  1. [新增] API 提供商選擇器 (Pollinations/Replicate/All)
//  2. [新增] 按提供商過濾模型功能
//  3. [新增] 提供商信息顯示 (模型數/費用/特點)
//  4. [優化] 智能模型分組和排序
//  5. [優化] UI 布局和交互體驗
//  6. [保留] 所有 12 個 Pollinations 免費模型
//  7. [保留] 所有現有功能完整支持
// =================================================================================

// --- [第一部分: 核心配置] ---
const CONFIG = {
  PROJECT_NAME: "ai-generator-multi-model",
  PROJECT_VERSION: "2.13.0",
  
  API_MASTER_KEY: "1", 
  
  UPSTREAM_ORIGIN: "https://ai-image-generator.co",
  POLLINATIONS_ORIGIN: "https://image.pollinations.ai",
  
  // API 提供商配置
  API_PROVIDERS: {
    "pollinations": {
      name: "Pollinations.ai",
      description: "12個完全免費的專業AI模型",
      icon: "🆓",
      isFree: true,
      modelCount: 12,
      features: ["完全免費", "無需積分", "專業質量", "1-4張並發"]
    },
    "replicate": {
      name: "Replicate",
      description: "高端付費模型,需要積分",
      icon: "💎",
      isFree: false,
      features: ["頂級質量", "官方模型", "穩定可靠"]
    },
    "all": {
      name: "所有提供商",
      description: "顯示所有可用模型",
      icon: "🌐",
      isFree: null,
      features: ["免費+付費", "完整選擇"]
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
    "auto": {
      name: "自動",
      prompt: "",
      description: "讓AI自動選擇最佳風格"
    },
    "anime": {
      name: "日本動漫",
      prompt: "anime style, vibrant colors, manga art, Japanese animation, cel shading",
      description: "日本動畫風格,明亮色彩"
    },
    "manga": {
      name: "日本漫畫",
      prompt: "manga style, black and white, ink drawing, Japanese comic book art, detailed linework, screentone shading",
      description: "黑白漫畫風格,細膩線條"
    },
    "realistic": {
      name: "寫實照片",
      prompt: "photorealistic, highly detailed, 8k uhd, professional photography, natural lighting, dslr quality",
      description: "照片級寫實風格"
    },
    "oil-painting": {
      name: "油畫",
      prompt: "oil painting, classical art, brushstrokes visible, rich colors, canvas texture, Renaissance style",
      description: "古典油畫風格"
    },
    "watercolor": {
      name: "水彩畫",
      prompt: "watercolor painting, soft edges, translucent colors, artistic, flowing pigments, paper texture",
      description: "柔和水彩風格"
    },
    "cyberpunk": {
      name: "賽博朋克",
      prompt: "cyberpunk style, neon lights, futuristic, dark atmosphere, high tech low life, dystopian city",
      description: "未來霓虹科幻風格"
    },
    "fantasy": {
      name: "奇幻藝術",
      prompt: "fantasy art, magical, ethereal, detailed illustration, epic scene, dramatic lighting, concept art",
      description: "魔幻奇幻風格"
    },
    "sketch": {
      name: "素描",
      prompt: "pencil sketch, graphite drawing, hand drawn, artistic sketch, detailed shading, monochrome",
      description: "鉛筆素描風格"
    },
    "3d-render": {
      name: "3D渲染",
      prompt: "3d render, octane render, blender, highly detailed, smooth surfaces, professional 3d modeling, ray tracing",
      description: "三維建模渲染"
    },
    "pixel-art": {
      name: "像素藝術",
      prompt: "pixel art, 8bit style, retro gaming, pixelated, isometric, vibrant colors, nostalgic",
      description: "復古像素風格"
    },
    "comic": {
      name: "美式漫畫",
      prompt: "comic book style, bold lines, halftone dots, action pose, superhero art, dynamic composition",
      description: "美式漫畫風格"
    },
    "impressionism": {
      name: "印象派",
      prompt: "impressionist painting, loose brushwork, light and color emphasis, Monet style, outdoor scene",
      description: "莫內印象派風格"
    },
    "art-nouveau": {
      name: "新藝術",
      prompt: "art nouveau style, organic forms, flowing lines, decorative elements, elegant curves, vintage poster",
      description: "裝飾藝術風格"
    },
    "steampunk": {
      name: "蒸汽朋克",
      prompt: "steampunk style, Victorian era, brass and copper, gears and cogs, industrial, vintage machinery",
      description: "維多利亞機械風格"
    },
    "minimalist": {
      name: "極簡主義",
      prompt: "minimalist art, clean lines, simple composition, limited color palette, modern design, negative space",
      description: "簡約現代風格"
    },
    "surreal": {
      name: "超現實",
      prompt: "surrealist art, dreamlike, impossible geometry, Salvador Dali style, bizarre composition, subconscious imagery",
      description: "達利超現實風格"
    },
    "chinese-ink": {
      name: "中國水墨",
      prompt: "Chinese ink painting, sumi-e style, flowing brushstrokes, monochrome or minimal color, traditional Asian art",
      description: "傳統水墨畫風格"
    },
    "ukiyo-e": {
      name: "浮世繪",
      prompt: "ukiyo-e style, Japanese woodblock print, flat colors, bold outlines, Edo period art, Hokusai style",
      description: "日本浮世繪風格"
    }
  },
  
  DEFAULT_STYLE: "auto",
  
  // Pollinations 完整模型配置 (12個免費模型)
  POLLINATIONS_MODELS: {
    // === 基礎高速模型 ===
    "pollinations-turbo": {
      displayName: "Pollinations Turbo",
      provider: "pollinations",
      upstreamModel: "turbo",
      credits: 0,
      speed: "very-fast",
      quality: "good",
      description: "超快速基礎模型,適合快速迭代",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "basic"
    },
    "pollinations-flux": {
      displayName: "Pollinations Flux",
      provider: "pollinations",
      upstreamModel: "flux",
      credits: 0,
      speed: "fast",
      quality: "excellent",
      description: "高質量通用模型,平衡速度與品質",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "basic"
    },
    
    // === 專業級模型 ===
    "pollinations-flux-pro": {
      displayName: "Pollinations Flux Pro ⭐",
      provider: "pollinations",
      upstreamModel: "flux-pro",
      credits: 0,
      speed: "medium",
      quality: "best",
      description: "專業級Flux Pro,極致細節和質量",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "professional"
    },
    "pollinations-flux-1.1-pro": {
      displayName: "Pollinations Flux 1.1 Pro 🔥",
      provider: "pollinations",
      upstreamModel: "flux-1.1-pro",
      credits: 0,
      speed: "medium",
      quality: "best",
      description: "最新1.1版本,更快更準確",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "professional"
    },
    "pollinations-flux-realism": {
      displayName: "Pollinations Flux Realism",
      provider: "pollinations",
      upstreamModel: "flux-realism",
      credits: 0,
      speed: "medium",
      quality: "excellent",
      description: "寫實風格特化,照片級真實感",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "professional"
    },
    
    // === 特化專用模型 ===
    "pollinations-flux-anime": {
      displayName: "Pollinations Flux Anime",
      provider: "pollinations",
      upstreamModel: "flux-anime",
      credits: 0,
      speed: "medium",
      quality: "excellent",
      description: "動漫風格特化,完美的二次元",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "specialized"
    },
    "pollinations-flux-3d": {
      displayName: "Pollinations Flux 3D",
      provider: "pollinations",
      upstreamModel: "flux-3d",
      credits: 0,
      speed: "medium",
      quality: "excellent",
      description: "3D渲染風格,立體建模效果",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "specialized"
    },
    "pollinations-flux-kontext": {
      displayName: "Pollinations Flux Kontext 🎯",
      provider: "pollinations",
      upstreamModel: "flux-kontext",
      credits: 0,
      speed: "medium",
      quality: "excellent",
      description: "情境理解增強,複雜場景構圖",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "specialized"
    },
    "pollinations-flux-kontext-por": {
      displayName: "Pollinations Flux Kontext Por 🔥",
      provider: "pollinations",
      upstreamModel: "flux.1-kontext-por",
      credits: 0,
      speed: "medium",
      quality: "best",
      description: "Kontext Por版,藝術創作增強",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "specialized"
    },
    
    // === 實驗特效模型 ===
    "pollinations-flux-cablyai": {
      displayName: "Pollinations Flux CablyAI",
      provider: "pollinations",
      upstreamModel: "flux-cablyai",
      credits: 0,
      speed: "medium",
      quality: "excellent",
      description: "CablyAI增強版,創意構圖優化",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "experimental"
    },
    "pollinations-any-dark": {
      displayName: "Pollinations Any Dark",
      provider: "pollinations",
      upstreamModel: "any-dark",
      credits: 0,
      speed: "fast",
      quality: "good",
      description: "暗色調風格,低光環境優化",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "experimental"
    },
    "pollinations-midjourney": {
      displayName: "Pollinations Midjourney Style",
      provider: "pollinations",
      upstreamModel: "midjourney",
      credits: 0,
      speed: "medium",
      quality: "excellent",
      description: "Midjourney風格模擬,藝術感強",
      maxImages: 4,
      supportsNSFW: true,
      isFree: true,
      category: "experimental"
    }
  },
  
  UPSTREAM_MODEL_DEFAULTS: {
    maxImages: 4,
    supportsNSFW: true,
    isFree: false,
    speed: "medium",
    quality: "excellent"
  },
  
  MAX_IMAGES: 4,
  DEFAULT_NUM_IMAGES: 1,
};

// 全局緩存
let CACHED_MODELS = null;
let CACHE_TIMESTAMP = 0;

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
    if (url.pathname === '/v1/models/refresh') return handleModelsRefresh(request, apiKey);
    if (url.pathname === '/v1/styles') return handleStylesRequest();
    if (url.pathname === '/v1/providers') return handleProvidersRequest();
    
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

function applyStyleToPrompt(prompt, style) {
    if (!style || style === "auto" || style === "none") {
        return prompt;
    }
    
    const styleConfig = CONFIG.STYLE_PRESETS[style];
    if (!styleConfig || !styleConfig.prompt) {
        return prompt;
    }
    
    return `${prompt}, ${styleConfig.prompt}`;
}

async function fetchUpstreamModels() {
    try {
        const fingerprint = generateFingerprint();
        const anonUserId = crypto.randomUUID();
        const { headers } = getFakeHeaders(fingerprint, anonUserId);
        
        console.log('[Model Sync] Fetching models from upstream...');
        
        const response = await fetch(`${CONFIG.UPSTREAM_ORIGIN}/api/models`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            console.log('[Model Sync] Upstream returned:', response.status);
            return null;
        }
        
        const data = await response.json();
        console.log('[Model Sync] Received models:', data);
        
        if (data && Array.isArray(data.models)) {
            return data.models;
        }
        return null;
    } catch (e) {
        console.log('[Model Sync] Error:', e.message);
        return null;
    }
}

function convertUpstreamModel(upstreamModel) {
    const modelId = upstreamModel.id || upstreamModel.name;
    const provider = upstreamModel.provider || "replicate";
    
    return {
        displayName: upstreamModel.displayName || upstreamModel.name || modelId,
        provider: provider,
        credits: upstreamModel.credits || 2,
        speed: upstreamModel.speed || CONFIG.UPSTREAM_MODEL_DEFAULTS.speed,
        quality: upstreamModel.quality || CONFIG.UPSTREAM_MODEL_DEFAULTS.quality,
        description: upstreamModel.description || "AI圖像生成模型",
        maxImages: upstreamModel.maxImages || CONFIG.UPSTREAM_MODEL_DEFAULTS.maxImages,
        supportsNSFW: upstreamModel.supportsNSFW !== false,
        isFree: false,
        category: "premium",
        lastUpdated: new Date().toISOString()
    };
}

async function getAllModels() {
    const now = Date.now();
    
    if (CACHED_MODELS && (now - CACHE_TIMESTAMP) < CONFIG.MODEL_CACHE_TTL * 1000) {
        return CACHED_MODELS;
    }
    
    const upstreamModels = await fetchUpstreamModels();
    const allModels = { ...CONFIG.POLLINATIONS_MODELS };
    
    if (upstreamModels && upstreamModels.length > 0) {
        upstreamModels.forEach(model => {
            const modelId = model.id || model.name;
            if (modelId && !allModels[modelId]) {
                allModels[modelId] = convertUpstreamModel(model);
            }
        });
        console.log(`[Model Sync] Synced ${upstreamModels.length} upstream models`);
    } else {
        console.log('[Model Sync] Using fallback static models');
        Object.assign(allModels, {
            "flux-schnell": {
                displayName: "Flux Schnell",
                provider: "replicate",
                credits: 1,
                speed: "fast",
                quality: "good",
                description: "快速生成,適合快速迭代",
                maxImages: 4,
                supportsNSFW: true,
                isFree: false,
                category: "premium"
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
                isFree: false,
                category: "premium"
            }
        });
    }
    
    CACHED_MODELS = allModels;
    CACHE_TIMESTAMP = now;
    return allModels;
}

function getModelConfig(model) {
    if (CACHED_MODELS && CACHED_MODELS[model]) {
        return CACHED_MODELS[model];
    }
    return CONFIG.POLLINATIONS_MODELS[model] || CONFIG.POLLINATIONS_MODELS["pollinations-flux"];
}

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

async function performPollinationsGeneration(prompt, model, aspectRatio, logger, index = 0, safeMode = true) {
    const modelConfig = getModelConfig(model);
    const logPrefix = index > 0 ? `[Image ${index+1}]` : "";
    const dimensions = convertAspectRatioForPollinations(aspectRatio);
    
    logger.add(`${logPrefix}Pollinations Request`, {
        provider: "pollinations",
        model: modelConfig.upstreamModel,
        displayName: modelConfig.displayName,
        prompt: prompt.substring(0, 50) + "...",
        dimensions: dimensions,
        safeMode: safeMode,
        isFree: true
    });

    const params = new URLSearchParams({
        model: modelConfig.upstreamModel,
        width: dimensions.width.toString(),
        height: dimensions.height.toString(),
        nologo: "true",
        enhance: safeMode ? "false" : "true",
        nofeed: "true"
    });
    
    const imageUrl = `${CONFIG.POLLINATIONS_ORIGIN}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    logger.add(`${logPrefix}Pollinations URL`, imageUrl);
    
    try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (response.ok) {
            logger.add(`${logPrefix}Pollinations Success`, { status: response.status, url: imageUrl });
            return imageUrl;
        } else {
            throw new Error(`Pollinations returned ${response.status}`);
        }
    } catch (e) {
        logger.add(`${logPrefix}Pollinations Error`, e.message);
        throw e;
    }
}

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
        logger.add(`${logPrefix}Deduct Response`, { status: deductRes.status, body: deductJson });
    } catch (e) {
        logger.add(`${logPrefix}Deduct Error`, e.message);
    }

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    formData.append("num_outputs", "1");
    formData.append("inputMode", "text");
    formData.append("style", safeMode ? "auto" : "none");
    formData.append("safe_mode", safeMode ? "true" : "false");
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
        displayName: modelConfig.displayName,
        provider: modelConfig.provider,
        isFree: modelConfig.isFree,
        safeMode: safeMode,
        prompt: prompt.substring(0, 80) + "..."
    });

    const promises = [];
    for (let i = 0; i < count; i++) {
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
        
        const style = body.style || CONFIG.DEFAULT_STYLE;
        const styledPrompt = applyStyleToPrompt(prompt, style);
        
        logger.add("Style Applied", {
            originalPrompt: prompt.substring(0, 50) + "...",
            style: style,
            styleName: CONFIG.STYLE_PRESETS[style]?.name || "Custom",
            finalPrompt: styledPrompt.substring(0, 80) + "..."
        });

        const allModels = await getAllModels();
        const requestedModel = body.model || "pollinations-flux";
        const model = allModels[requestedModel] ? requestedModel : "pollinations-flux";
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
        
        const numImages = Math.min(Math.max(1, body.n || CONFIG.DEFAULT_NUM_IMAGES), CONFIG.MAX_IMAGES);
        const aspectRatio = body.aspect_ratio || body.size || "1:1";
        let finalAspectRatio = "1:1";
        if (aspectRatio === "1024x1792" || aspectRatio === "9:16") finalAspectRatio = "9:16";
        else if (aspectRatio === "1792x1024" || aspectRatio === "16:9") finalAspectRatio = "16:9";
        else if (aspectRatio === "4:3") finalAspectRatio = "4:3";
        else if (aspectRatio === "3:4") finalAspectRatio = "3:4";
        else finalAspectRatio = "1:1";

        const imageUrls = await performBatchGeneration(styledPrompt, model, finalAspectRatio, numImages, logger, safeMode);

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
                choices: [{ index: 0, message: { role: "assistant", content: respContent }, finish_reason: "stop" }]
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
        let prompt = body.prompt;
        
        const style = body.style || CONFIG.DEFAULT_STYLE;
        prompt = applyStyleToPrompt(prompt, style);
        
        const allModels = await getAllModels();
        const requestedModel = body.model || "pollinations-flux";
        const model = allModels[requestedModel] ? requestedModel : "pollinations-flux";
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

async function handleModelsRequest() {
    const allModels = await getAllModels();
    const modelIds = Object.keys(allModels);
    const cacheAge = CACHE_TIMESTAMP > 0 ? Math.floor((Date.now() - CACHE_TIMESTAMP) / 1000) : 0;
    
    return new Response(JSON.stringify({
        object: 'list',
        data: modelIds.map(id => ({
            id,
            object: 'model',
            created: Date.now(),
            owned_by: 'ai-generator',
            ...allModels[id]
        })),
        cache_info: {
            cached: CACHED_MODELS !== null,
            age_seconds: cacheAge,
            ttl_seconds: CONFIG.MODEL_CACHE_TTL,
            last_updated: CACHE_TIMESTAMP > 0 ? new Date(CACHE_TIMESTAMP).toISOString() : null
        }
    }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
}

async function handleModelsRefresh(request, apiKey) {
    if (!verifyAuth(request, apiKey)) return createErrorResponse('Unauthorized', 401, 'unauthorized');
    
    try {
        CACHED_MODELS = null;
        CACHE_TIMESTAMP = 0;
        const allModels = await getAllModels();
        const modelCount = Object.keys(allModels).length;
        const freeCount = Object.values(allModels).filter(m => m.isFree).length;
        
        return new Response(JSON.stringify({
            success: true,
            message: "Models refreshed successfully",
            total_models: modelCount,
            free_models: freeCount,
            paid_models: modelCount - freeCount,
            timestamp: new Date().toISOString(),
            models: Object.keys(allModels)
        }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
    } catch (e) {
        return createErrorResponse(e.message, 500, 'refresh_failed');
    }
}

function handleStylesRequest() {
    return new Response(JSON.stringify({
        object: 'list',
        data: Object.keys(CONFIG.STYLE_PRESETS).map(id => ({
            id,
            name: CONFIG.STYLE_PRESETS[id].name,
            description: CONFIG.STYLE_PRESETS[id].description,
            prompt_enhancement: CONFIG.STYLE_PRESETS[id].prompt
        }))
    }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
}

function handleProvidersRequest() {
    return new Response(JSON.stringify({
        object: 'list',
        data: Object.keys(CONFIG.API_PROVIDERS).map(id => ({
            id,
            ...CONFIG.API_PROVIDERS[id]
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
  
  const styleOptions = Object.keys(CONFIG.STYLE_PRESETS).map(styleId => {
    const style = CONFIG.STYLE_PRESETS[styleId];
    const isDefault = styleId === CONFIG.DEFAULT_STYLE;
    return `<option value="${styleId}" ${isDefault ? 'selected' : ''}>${style.name} - ${style.description}</option>`;
  }).join('\n');
  
  const providerOptions = Object.keys(CONFIG.API_PROVIDERS).map(providerId => {
    const provider = CONFIG.API_PROVIDERS[providerId];
    const isDefault = providerId === CONFIG.DEFAULT_PROVIDER;
    return `<option value="${providerId}" ${isDefault ? 'selected' : ''}>${provider.icon} ${provider.name} - ${provider.description}</option>`;
  }).join('\n');
  
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
      .box { background: #27272a; padding: 16px; border-radius: 8px; border: 1px solid #3f3f46; margin-bottom: 20px; }
      .warning-box { background: #7f1d1d; border-color: #991b1b; padding: 12px; margin-bottom: 16px; border-radius: 6px; font-size: 12px; color: #fecaca; }
      .info-box { background: #064e3b; border: 1px solid #059669; padding: 12px; margin-bottom: 16px; border-radius: 6px; font-size: 12px; color: #6ee7b7; }
      .provider-box { background: #1e3a8a; border: 1px solid #3b82f6; padding: 12px; margin-bottom: 16px; border-radius: 6px; font-size: 11px; color: #93c5fd; }
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
      .btn-refresh { background: var(--accent); font-size: 12px; padding: 8px; margin-top: 10px; }
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
            🆓 <strong>12個免費模型!</strong><br>
            含 Flux Pro/Kontext 等專業模型<br>
            <span id="model-count" style="font-size: 11px; opacity: 0.8;">載入模型中...</span>
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
            <span class="label">🌐 API 提供商</span>
            <select id="provider" onchange="updateProvider()">
                ${providerOptions}
            </select>
            <div id="provider-info" class="provider-box" style="margin-top: 12px;"></div>
            
            <span class="label">🤖 AI 模型</span>
            <select id="model" onchange="updateModelInfo()">
                <option value="pollinations-flux" selected>載入中...</option>
            </select>
            <button class="btn-refresh" onclick="refreshModels()">🔄 刷新模型列表</button>
            <div id="model-info" style="font-size: 11px; color: #10b981; margin-top: 8px;"></div>
            
            <span class="label">🎨 藝術風格</span>
            <select id="style" onchange="updateStyleInfo()">
                ${styleOptions}
            </select>
            <div id="style-info" style="font-size: 11px; color: #a1a1aa; margin-top: -8px; margin-bottom: 12px;"></div>
            
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
            <textarea id="prompt" rows="6" placeholder="描述你想生成的圖片...\n\n例如: 一個可愛的貓女孩"></textarea>
            
            <button id="btn-gen" onclick="generate()">🚀 開始生成</button>
        </div>
    </div>

    <main class="main">
        <div class="result-area" id="result-container">
            <div style="color:#3f3f46; text-align:center;">
                <p style="font-size: 16px;">📸 圖片預覽區域</p>
                <p style="font-size: 12px;">支持多個 API 提供商 · 包含 12 個 Pollinations 免費模型 · 最多生成 ${CONFIG.MAX_IMAGES} 張圖片</p>
                <p style="font-size: 12px;">🎨 現已支持 ${Object.keys(CONFIG.STYLE_PRESETS).length} 種藝術風格</p>
                <div class="spinner" id="spinner"></div>
            </div>
        </div>
        
        <div class="status-bar">
            <span id="status-text">系統就緒 · 載入模型中...</span>
            <span id="time-text"></span>
        </div>

        <div class="log-panel" id="logs">
            <div style="color:#52525b">// 等待請求...</div>
        </div>
    </main>

    <script>
        const API_KEY = "${apiKey}";
        const ENDPOINT = "${origin}/v1/chat/completions";
        const MODELS_ENDPOINT = "${origin}/v1/models";
        const REFRESH_ENDPOINT = "${origin}/v1/models/refresh";
        const PROVIDERS_ENDPOINT = "${origin}/v1/providers";
        const STYLES = ${JSON.stringify(CONFIG.STYLE_PRESETS)};
        const PROVIDERS = ${JSON.stringify(CONFIG.API_PROVIDERS)};
        
        let MODEL_CONFIGS = {};
        let MODEL_IDS = [];
        let CURRENT_PROVIDER = "${CONFIG.DEFAULT_PROVIDER}";

        function copy(text) { navigator.clipboard.writeText(text); alert('已複製'); }

        async function loadModels() {
            try {
                const res = await fetch(MODELS_ENDPOINT);
                const data = await res.json();
                
                MODEL_CONFIGS = {};
                MODEL_IDS = [];
                
                data.data.forEach(model => {
                    MODEL_CONFIGS[model.id] = model;
                    MODEL_IDS.push(model.id);
                });
                
                updateProvider();
                
                const freeCount = data.data.filter(m => m.isFree).length;
                const totalCount = data.data.length;
                document.getElementById('model-count').innerText = `載入 ${totalCount} 個模型 (${freeCount} 個免費)`;
                
                const cacheInfo = data.cache_info;
                let statusText = `系統就緒 · ${totalCount} 個模型可用 (${freeCount} 個免費)`;
                if (cacheInfo && cacheInfo.last_updated) {
                    const updateTime = new Date(cacheInfo.last_updated).toLocaleTimeString();
                    statusText += ` · 更新於 ${updateTime}`;
                }
                document.getElementById('status-text').innerText = statusText;
                appendLog("Models Loaded", `Total: ${totalCount}, Free: ${freeCount}`);
            } catch (e) {
                console.error('Failed to load models:', e);
                appendLog("Error", "Failed to load models: " + e.message);
            }
        }
        
        function updateProvider() {
            CURRENT_PROVIDER = document.getElementById('provider').value;
            updateProviderInfo();
            updateModelSelect();
        }
        
        function updateProviderInfo() {
            const provider = PROVIDERS[CURRENT_PROVIDER];
            const infoDiv = document.getElementById('provider-info');
            
            if (!provider) return;
            
            let filteredModels = MODEL_IDS;
            if (CURRENT_PROVIDER !== 'all') {
                filteredModels = MODEL_IDS.filter(id => MODEL_CONFIGS[id].provider === CURRENT_PROVIDER);
            }
            
            const freeModels = filteredModels.filter(id => MODEL_CONFIGS[id].isFree).length;
            const paidModels = filteredModels.length - freeModels;
            
            let html = `<strong>${provider.icon} ${provider.name}</strong><br>`;
            html += `模型數: ${filteredModels.length}個 `;
            if (freeModels > 0) html += `(${freeModels}個免費)`;
            if (paidModels > 0) html += ` (${paidModels}個付費)`;
            html += `<br>`;
            html += `特點: ${provider.features.join(' · ')}`;
            
            infoDiv.innerHTML = html;
        }
        
        function updateModelSelect() {
            const modelSelect = document.getElementById('model');
            
            // 按提供商過濾
            let filteredModels = MODEL_IDS;
            if (CURRENT_PROVIDER !== 'all') {
                filteredModels = MODEL_IDS.filter(id => MODEL_CONFIGS[id].provider === CURRENT_PROVIDER);
            }
            
            // 按類別分組
            const basicModels = filteredModels.filter(id => MODEL_CONFIGS[id].isFree && MODEL_CONFIGS[id].category === 'basic');
            const professionalModels = filteredModels.filter(id => MODEL_CONFIGS[id].isFree && MODEL_CONFIGS[id].category === 'professional');
            const specializedModels = filteredModels.filter(id => MODEL_CONFIGS[id].isFree && MODEL_CONFIGS[id].category === 'specialized');
            const experimentalModels = filteredModels.filter(id => MODEL_CONFIGS[id].isFree && MODEL_CONFIGS[id].category === 'experimental');
            const paidModels = filteredModels.filter(id => !MODEL_CONFIGS[id].isFree);
            
            let html = '';
            
            // 基礎免費模型
            if (basicModels.length > 0) {
                html += '<optgroup label="🆓 基礎免費模型">';
                basicModels.forEach(id => {
                    const config = MODEL_CONFIGS[id];
                    html += `<option value="${id}">${config.displayName} - ${config.description}</option>`;
                });
                html += '</optgroup>';
            }
            
            // 專業免費模型
            if (professionalModels.length > 0) {
                html += '<optgroup label="🌟 專業免費模型">';
                professionalModels.forEach(id => {
                    const config = MODEL_CONFIGS[id];
                    html += `<option value="${id}">${config.displayName} - ${config.description}</option>`;
                });
                html += '</optgroup>';
            }
            
            // 特化免費模型
            if (specializedModels.length > 0) {
                html += '<optgroup label="🎯 特化免費模型">';
                specializedModels.forEach(id => {
                    const config = MODEL_CONFIGS[id];
                    html += `<option value="${id}">${config.displayName} - ${config.description}</option>`;
                });
                html += '</optgroup>';
            }
            
            // 實驗免費模型
            if (experimentalModels.length > 0) {
                html += '<optgroup label="✨ 實驗免費模型">';
                experimentalModels.forEach(id => {
                    const config = MODEL_CONFIGS[id];
                    html += `<option value="${id}">${config.displayName} - ${config.description}</option>`;
                });
                html += '</optgroup>';
            }
            
            // 付費高端模型
            if (paidModels.length > 0) {
                html += '<optgroup label="💎 付費高端模型">';
                paidModels.forEach(id => {
                    const config = MODEL_CONFIGS[id];
                    const nsfwTag = config.supportsNSFW ? '' : ' [僅安全]';
                    html += `<option value="${id}">${config.displayName}${nsfwTag} - ${config.description} (${config.credits}學分)</option>`;
                });
                html += '</optgroup>';
            }
            
            if (filteredModels.length === 0) {
                html = '<option value="">沒有可用模型</option>';
            }
            
            modelSelect.innerHTML = html;
            updateModelInfo();
        }
        
        async function refreshModels() {
            const btn = event.target;
            btn.disabled = true;
            btn.innerText = '🔄 刷新中...';
            
            try {
                appendLog("System", "Refreshing models from upstream...");
                const res = await fetch(REFRESH_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY }
                });
                const data = await res.json();
                
                if (data.success) {
                    appendLog("Model Refresh", data);
                    alert(`模型更新成功!\n總計: ${data.total_models}\n免費: ${data.free_models}\n付費: ${data.paid_models}`);
                    await loadModels();
                } else {
                    throw new Error(data.message || 'Refresh failed');
                }
            } catch (e) {
                appendLog("Error", "Refresh failed: " + e.message);
                alert('模型更新失敗: ' + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = '🔄 刷新模型列表';
            }
        }
        
        function updateStyleInfo() {
            const style = document.getElementById('style').value;
            const styleConfig = STYLES[style];
            const infoDiv = document.getElementById('style-info');
            
            if (style === 'auto') {
                infoDiv.innerHTML = 'ℹ️ AI 將自動選擇最佳風格';
            } else if (styleConfig) {
                infoDiv.innerHTML = `💡 將增強提示詞以匹配 ${styleConfig.name} 風格`;
            }
        }

        function updateModelInfo() {
            const model = document.getElementById('model').value;
            const modelConfig = MODEL_CONFIGS[model];
            if (!modelConfig) return;
            
            const infoDiv = document.getElementById('model-info');
            const providerInfo = PROVIDERS[modelConfig.provider];
            
            let infoText = '';
            if (modelConfig.isFree) {
                infoText = '✨ 完全免費 · 無需積分';
                infoDiv.style.color = '#10b981';
            } else {
                infoText = `💳 消耗 ${modelConfig.credits} 學分/張`;
                infoDiv.style.color = '#fbbf24';
            }
            
            if (providerInfo) {
                infoText += ` · ${providerInfo.icon} ${providerInfo.name}`;
            }
            
            infoDiv.innerHTML = infoText;
            updateImageOptions();
        }

        function updateSafeMode() {
            const safeMode = document.getElementById('safe-mode').checked;
            const warning = document.getElementById('nsfw-warning');
            const model = document.getElementById('model').value;
            const modelConfig = MODEL_CONFIGS[model];
            
            if (!safeMode) {
                if (!modelConfig || !modelConfig.supportsNSFW) {
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
            if (!modelConfig) return;
            
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
        
        loadModels();
        updateStyleInfo();

        function appendLog(step, data) {
            const logs = document.getElementById('logs');
            const div = document.createElement('div');
            div.className = 'log-entry';
            const time = new Date().toLocaleTimeString();
            let content = typeof data === 'object' ? `<span class="log-json">${JSON.stringify(data, null, 2)}</span>` : `<span style="color:#e4e4e7">${data}</span>`;
            div.innerHTML = `<span class="log-time">[${time}]</span><span class="log-key">${step}</span>${content}`;
            if (logs.innerText.includes('//')) logs.innerHTML = '';
            logs.appendChild(div);
            logs.scrollTop = logs.scrollHeight;
        }

        async function generate() {
            const prompt = document.getElementById('prompt').value.trim();
            if (!prompt) return alert('請輸入提示詞');

            const model = document.getElementById('model').value;
            const style = document.getElementById('style').value;
            const numImages = parseInt(document.getElementById('num-images').value) || 1;
            const aspectRatio = document.getElementById('ratio').value;
            const safeMode = document.getElementById('safe-mode').checked;
            const modelConfig = MODEL_CONFIGS[model];
            if (!modelConfig) return alert('模型配置錯誤');
            
            const styleConfig = STYLES[style];
            const providerInfo = PROVIDERS[modelConfig.provider] || {};
            const modeText = safeMode ? '安全模式' : '🔞 藝術模式';
            const costText = modelConfig.isFree ? '免費' : `${modelConfig.credits * numImages}學分`;
            
            const btn = document.getElementById('btn-gen');
            const spinner = document.getElementById('spinner');
            const status = document.getElementById('status-text');
            const container = document.getElementById('result-container');
            const timeText = document.getElementById('time-text');
            
            if(btn) { btn.disabled = true; btn.innerText = `生成 ${numImages} 張中...`; }
            if(spinner) spinner.style.display = 'inline-block';
            if(status) status.innerText = `正在使用 ${modelConfig.displayName} (${providerInfo.icon} ${providerInfo.name}, ${styleConfig.name}, ${modeText}, ${costText})...`;
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
                    safe_mode: safeMode,
                    style: style
                };

                appendLog("System", `Provider: ${providerInfo.name} | Model: ${modelConfig.displayName} | Style: ${styleConfig.name} | Free: ${modelConfig.isFree}`);

                const res = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error?.message || `HTTP ${res.status}`);
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullContent = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
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

                const urlRegex = /\!\[.*?\]\((.*?)\)/g;
                const matches = [...fullContent.matchAll(urlRegex)];
                
                if (matches.length > 0) {
                    const imageUrls = matches.map(m => m[1]);
                    const gridHtml = imageUrls.map((url, idx) => 
                        `<div class="image-item">
                            <img src="${url}" class="result-img" onclick="window.open(this.src)">
                            <div class="image-label">圖片 ${idx + 1} / ${imageUrls.length} · ${providerInfo.icon} ${providerInfo.name} · ${styleConfig.name}</div>
                        </div>`
                    ).join('');
                    
                    if(container) container.innerHTML = `<div class="image-grid">${gridHtml}</div>`;
                    if(status) status.innerText = `✅ ${modelConfig.displayName} (${providerInfo.icon} ${providerInfo.name}, ${styleConfig.name}, ${modeText}) 成功生成 ${imageUrls.length} 張 | ${costText}`;
                    if(timeText) timeText.innerText = `耗時: ${((Date.now()-startTime)/1000).toFixed(2)}s`;
                    appendLog("Success", `Generated ${imageUrls.length} images via ${providerInfo.name} with ${styleConfig.name} style`);
                } else {
                    throw new Error("無法提取圖片 URL");
                }

            } catch (e) {
                if(container) container.innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center">❌ ${e.message}</div>`;
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