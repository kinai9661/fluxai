#!/bin/bash
# =================================================================================
# AI Generator 2API - 完整測試腳本
# 版本: 1.0.0
# 測試 v2.5.0 多張圖片生成功能
# =================================================================================

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置 (請修改為你的實際值)
WORKER_URL="https://ai-generator-2api-cfwork.kinai9661.workers.dev"
API_KEY="1"  # 替換為你的實際 API 密鑰

# 測試計數器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${CYAN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  AI Generator 2API - 測試套件 v1.0.0"
echo "  測試目標: ${WORKER_URL}"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# 測試函數
test_api() {
    local test_name="$1"
    local endpoint="$2"
    local payload="$3"
    local expected_images="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${BLUE}[測試 $TOTAL_TESTS]${NC} $test_name"
    echo -e "${YELLOW}端點:${NC} $endpoint"
    echo -e "${YELLOW}預期圖片數:${NC} $expected_images 張"
    echo -n "執行中..."
    
    # 發送請求
    response=$(curl -s -w "\n%{http_code}" -X POST "${WORKER_URL}${endpoint}" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    # 分離響應體和狀態碼
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # 檢查 HTTP 狀態碼
    if [ "$http_code" != "200" ]; then
        echo -e "\r${RED}✗ 失敗${NC} - HTTP $http_code"
        echo -e "${RED}錯誤響應:${NC}"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # 解析 JSON 並計算圖片數量
    if echo "$body" | jq . >/dev/null 2>&1; then
        # Images API 格式
        image_count=$(echo "$body" | jq '.data | length' 2>/dev/null)
        
        # 如果是 Chat API 格式
        if [ -z "$image_count" ] || [ "$image_count" = "null" ]; then
            content=$(echo "$body" | jq -r '.choices[0].message.content' 2>/dev/null)
            if [ -n "$content" ]; then
                image_count=$(echo "$content" | grep -o '!\[' | wc -l)
            fi
        fi
        
        # 驗證圖片數量
        if [ "$image_count" = "$expected_images" ]; then
            echo -e "\r${GREEN}✓ 通過${NC} - 成功生成 $image_count 張圖片"
            
            # 顯示圖片 URL (前 2 個)
            if [ "$image_count" -gt 0 ]; then
                echo -e "${CYAN}圖片 URL (部分):${NC}"
                echo "$body" | jq -r '.data[]?.url' 2>/dev/null | head -2 | sed 's/^/  → /'
                if [ -z "$(echo "$body" | jq -r '.data[]?.url' 2>/dev/null)" ]; then
                    echo "$content" | grep -o 'https://[^)]*' | head -2 | sed 's/^/  → /'
                fi
            fi
            
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            echo -e "\r${RED}✗ 失敗${NC} - 預期 $expected_images 張,實際 $image_count 張"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    else
        echo -e "\r${RED}✗ 失敗${NC} - 無效的 JSON 響應"
        echo "$body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════════
# 測試套件開始
# ═══════════════════════════════════════════════════════════════

echo -e "\n${MAGENTA}▶ 測試組 1: Images API 端點${NC}"
echo "────────────────────────────────────────────────────────────"

# 測試 1.1: 單張圖片
test_api \
    "單張圖片生成 (1:1)" \
    "/v1/images/generations" \
    '{
        "prompt": "a cute cat wearing sunglasses, photorealistic",
        "n": 1,
        "size": "1024x1024"
    }' \
    1

sleep 2

# 測試 1.2: 兩張圖片
test_api \
    "兩張圖片生成 (16:9)" \
    "/v1/images/generations" \
    '{
        "prompt": "futuristic city with neon lights, cyberpunk style",
        "n": 2,
        "size": "1792x1024"
    }' \
    2

sleep 2

# 測試 1.3: 三張圖片
test_api \
    "三張圖片生成 (9:16)" \
    "/v1/images/generations" \
    '{
        "prompt": "beautiful mountain landscape at sunset",
        "n": 3,
        "size": "1024x1792"
    }' \
    3

sleep 2

# 測試 1.4: 四張圖片 (最大值)
test_api \
    "四張圖片生成 - 最大限制" \
    "/v1/images/generations" \
    '{
        "prompt": "fantasy dragon flying over castle, 4 different angles",
        "n": 4,
        "size": "1024x1024"
    }' \
    4

echo -e "\n${MAGENTA}▶ 測試組 2: Chat Completions API 端點${NC}"
echo "────────────────────────────────────────────────────────────"

sleep 2

# 測試 2.1: Chat API 單張
test_api \
    "Chat API - 單張圖片" \
    "/v1/chat/completions" \
    '{
        "model": "flux-schnell",
        "messages": [{"role": "user", "content": "a red sports car on a mountain road"}],
        "n": 1,
        "stream": false
    }' \
    1

sleep 2

# 測試 2.2: Chat API 兩張
test_api \
    "Chat API - 兩張圖片" \
    "/v1/chat/completions" \
    '{
        "model": "flux-schnell",
        "messages": [{"role": "user", "content": "astronaut floating in space"}],
        "n": 2,
        "aspect_ratio": "16:9",
        "stream": false
    }' \
    2

sleep 2

# 測試 2.3: Chat API 四張
test_api \
    "Chat API - 四張圖片 (最大值)" \
    "/v1/chat/completions" \
    '{
        "model": "flux-schnell",
        "messages": [{"role": "user", "content": "magical forest with glowing mushrooms"}],
        "n": 4,
        "aspect_ratio": "1:1",
        "stream": false
    }' \
    4

echo -e "\n${MAGENTA}▶ 測試組 3: 邊界條件測試${NC}"
echo "────────────────────────────────────────────────────────────"

sleep 2

# 測試 3.1: 超過最大值 (應該限制為4)
test_api \
    "超過最大值測試 (請求10張,應返回4張)" \
    "/v1/images/generations" \
    '{
        "prompt": "test image generation limit",
        "n": 10,
        "size": "1024x1024"
    }' \
    4

sleep 2

# 測試 3.2: 不同比例測試
test_api \
    "不同比例測試 (4:3)" \
    "/v1/chat/completions" \
    '{
        "model": "flux-schnell",
        "messages": [{"role": "user", "content": "landscape photography"}],
        "n": 2,
        "aspect_ratio": "4:3",
        "stream": false
    }' \
    2

echo -e "\n${MAGENTA}▶ 測試組 4: 模型列表端點${NC}"
echo "────────────────────────────────────────────────────────────"

# 測試 4.1: 獲取模型列表
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[測試 $TOTAL_TESTS]${NC} 獲取模型列表"
echo -n "執行中..."

response=$(curl -s -w "\n%{http_code}" -X GET "${WORKER_URL}/v1/models" \
    -H "Authorization: Bearer ${API_KEY}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    model_count=$(echo "$body" | jq '.data | length' 2>/dev/null)
    echo -e "\r${GREEN}✓ 通過${NC} - 返回 $model_count 個模型"
    echo -e "${CYAN}模型列表:${NC}"
    echo "$body" | jq -r '.data[].id' 2>/dev/null | sed 's/^/  → /'
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "\r${RED}✗ 失敗${NC} - HTTP $http_code"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# ═══════════════════════════════════════════════════════════════
# 測試結果摘要
# ═══════════════════════════════════════════════════════════════

echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  測試結果摘要${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "總測試數: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "通過: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失敗: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 所有測試通過!${NC}"
    exit 0
else
    success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "\n成功率: ${YELLOW}${success_rate}%${NC}"
    echo -e "${RED}⚠️  存在失敗的測試,請檢查上面的詳細信息${NC}"
    exit 1
fi