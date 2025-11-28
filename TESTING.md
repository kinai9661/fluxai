# 🧪 測試指南

本文檔提供 AI Generator 2API v2.5.0 的完整測試方案。

## 📊 測試概覽

### 測試範圍

- ✅ **單張圖片生成** - 驗證基本功能
- ✅ **多張圖片生成** (2-4張) - 測試並發功能
- ✅ **不同圖片比例** - 1:1, 16:9, 9:16, 4:3, 3:4
- ✅ **兩種 API 端點** - `/v1/images/generations` 和 `/v1/chat/completions`
- ✅ **邊界條件** - 最大數量限制測試
- ✅ **模型列表** - 可用模型查詢

### 測試工具

1. **Bash 腳本** (`test-api.sh`) - Linux/Mac 優先
2. **Python 腳本** (`test-api.py`) - 跨平台支持
3. **Web UI** - 手動測試

---

## 🚀 快速開始

### 方法 1: 使用 Bash 腳本 (Linux/Mac)

```bash
# 1. 下載測試腳本
wget https://raw.githubusercontent.com/kinai9661/ai-generator-2api-cfwork/main/test-api.sh

# 2. 賦予執行權限
chmod +x test-api.sh

# 3. 修改配置 (編輯文件中的 WORKER_URL 和 API_KEY)
nano test-api.sh

# 4. 執行測試
./test-api.sh
```

**輸出示例:**
```
══════════════════════════════════════════════════════════
  AI Generator 2API - 測試套件 v1.0.0
  測試目標: https://ai-generator-2api-cfwork.kinai9661.workers.dev
══════════════════════════════════════════════════════════

▶ 測試組 1: Images API 端點
────────────────────────────────────────────────────────

[測試 1] 單張圖片生成 (1:1)
端點: /v1/images/generations
預期圖片數: 1 張
✓ 通過 - 成功生成 1 張圖片
圖片 URL (部分):
  → https://replicate.delivery/yhqm/...
```

---

### 方法 2: 使用 Python 腳本 (所有平台)

```bash
# 1. 安裝依賴
pip install requests

# 2. 下載測試腳本
wget https://raw.githubusercontent.com/kinai9661/ai-generator-2api-cfwork/main/test-api.py
# 或
curl -O https://raw.githubusercontent.com/kinai9661/ai-generator-2api-cfwork/main/test-api.py

# 3. 修改配置
nano test-api.py  # 修改 WORKER_URL 和 API_KEY

# 4. 執行測試
python3 test-api.py
```

**Windows 用戶:**
```cmd
pip install requests
python test-api.py
```

**功能特點:**
- ✅ 跨平台支持 (Windows/Linux/Mac)
- ✅ 顏色輸出,易於閱讀
- ✅ 自動生成 JSON 報告
- ✅ 詳細的錯誤信息
- ✅ 測試時間統計

---

### 方法 3: Web UI 手動測試

#### 步驟 1: 訪問 Worker URL

```
https://ai-generator-2api-cfwork.kinai9661.workers.dev/
```

#### 步驟 2: 測試單張圖片

1. **生成數量**: 選擇 `1 張`
2. **比例**: 選擇 `1:1 (方形)`
3. **提示词**: 輸入 `a cute cat wearing sunglasses`
4. 點擊 **🚀 開始生成**
5. **驗證**:
   - ✅ 圖片成功顯示
   - ✅ 日誌顯示完整流程
   - ✅ 狀態顯示"生成成功"

#### 步驟 3: 測試多張圖片

1. **生成數量**: 選擇 `4 張`
2. **比例**: 選擇 `16:9 (横屏)`
3. **提示词**: 輸入 `futuristic city with neon lights, cyberpunk style`
4. 點擊 **🚀 開始生成**
5. **驗證**:
   - ✅ 4 張圖片以網格形式顯示
   - ✅ 每張圖片有標籤 "圖片 1/4"
   - ✅ 日誌顯示批量生成過程

#### 步驟 4: 檢查日誌

在底部日誌面板中應該看到:

```json
[時間] Batch Generation Start
{
  "requestedImages": 4,
  "actualImages": 4,
  "prompt": "..."
}

[時間] [Image 1] Identity Created
{
  "fingerprint": "a1b2c3d4...",
  "fakeIP": "123.45.67.89"
}

...

[時間] Batch Generation Complete
{
  "success": 4,
  "failed": 0
}
```

---

## 📝 API 測試示例

### 測試 1: Images API - 單張圖片

```bash
curl -X POST https://your-worker.workers.dev/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute cat wearing sunglasses",
    "n": 1,
    "size": "1024x1024"
  }'
```

**預期響應:**
```json
{
  "created": 1732780800,
  "data": [
    {"url": "https://replicate.delivery/..."}
  ]
}
```

### 測試 2: Images API - 多張圖片

```bash
curl -X POST https://your-worker.workers.dev/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "fantasy dragon flying over castle",
    "n": 4,
    "size": "1792x1024"
  }'
```

**預期響應:**
```json
{
  "created": 1732780800,
  "data": [
    {"url": "https://replicate.delivery/image1.jpg"},
    {"url": "https://replicate.delivery/image2.jpg"},
    {"url": "https://replicate.delivery/image3.jpg"},
    {"url": "https://replicate.delivery/image4.jpg"}
  ]
}
```

### 測試 3: Chat API - 多張圖片

```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "flux-schnell",
    "messages": [
      {"role": "user", "content": "astronaut floating in space"}
    ],
    "n": 3,
    "aspect_ratio": "16:9",
    "stream": false
  }'
```

**預期響應:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1732780800,
  "model": "flux-schnell",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "![Generated Image 1](https://...)\n\n![Generated Image 2](https://...)\n\n![Generated Image 3](https://...)"
    },
    "finish_reason": "stop"
  }]
}
```

### 測試 4: 模型列表

```bash
curl -X GET https://your-worker.workers.dev/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**預期響應:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "flux-schnell",
      "object": "model",
      "created": 1732780800,
      "owned_by": "ai-generator"
    }
  ]
}
```

---

## 🔍 測試清單

### 功能測試

- [ ] 單張圖片生成 (1:1)
- [ ] 兩張圖片生成 (16:9)
- [ ] 三張圖片生成 (9:16)
- [ ] 四張圖片生成 (最大值)
- [ ] Chat API 單張
- [ ] Chat API 多張
- [ ] 超過最大值限制 (10張 → 4張)
- [ ] 不同比例測試 (4:3, 3:4)
- [ ] 模型列表查詢
- [ ] Web UI 多圖展示
- [ ] 日誌完整性驗證

### 性能測試

- [ ] 單張圖片生成時間 < 30s
- [ ] 四張圖片並發生成時間 < 60s
- [ ] API 響應時間 < 5s (Worker 處理)

### 錯誤處理測試

- [ ] 無效 API 密鑰 → 401 Unauthorized
- [ ] 空提示词 → 適當錯誤提示
- [ ] 無效模型 → 適當錯誤提示
- [ ] 上游服務故障 → 失敗日誌記錄

---

## ❓ 常見問題

### Q1: 測試腳本在哪裡修改 Worker URL?

**Bash:**
```bash
# 編輯 test-api.sh 文件第 13-14 行
WORKER_URL="https://你的域名.workers.dev"
API_KEY="你的密鑰"
```

**Python:**
```python
# 編輯 test-api.py 文件第 13-14 行
WORKER_URL = "https://你的域名.workers.dev"
API_KEY = "你的密鑰"
```

### Q2: 如何查看詳細的測試結果?

Python 腳本會自動生成 JSON 報告:
```bash
cat test_results_20251128_143000.json
```

### Q3: 測試失敗怎麼辦?

1. **檢查 Worker 是否運行**:
   ```bash
   curl https://你的域名.workers.dev/v1/models
   ```

2. **檢查 API 密鑰**:
   - 確認 Cloudflare 環境變量 `API_MASTER_KEY` 設置正確

3. **檢查上游服務**:
   - 訪問 https://ai-image-generator.co 確認可用

4. **查看 Worker 日誌**:
   - Cloudflare Dashboard → Workers → 你的 Worker → Logs

### Q4: 為什麼生成很慢?

- **單張圖片**: 通常 15-30 秒
- **四張圖片**: 30-60 秒 (並發處理)

這是上游 Flux 模型的正常處理時間。

### Q5: 如何調試測試?

使用 `-v` 參數顯示詳細請求:
```bash
curl -v -X POST https://your-worker.workers.dev/v1/images/generations \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "n": 1}'
```

---

## 📊 測試結果示例

### 成功的測試輸出

```
══════════════════════════════════════════════════════════
  測試結果摘要
══════════════════════════════════════════════════════════
總測試數: 10
通過: 10
失敗: 0

🎉 所有測試通過!

詳細結果已保存至: test_results_20251128_143000.json
```

---

## 📞 支持

如遇到問題:

1. **檢查 README.md** - 基本使用說明
2. **查看 Worker 日誌** - Cloudflare Dashboard
3. **GitHub Issues** - [https://github.com/kinai9661/ai-generator-2api-cfwork/issues](https://github.com/kinai9661/ai-generator-2api-cfwork/issues)

---

## 📝 更新日誌

- **2025-11-28**: 初始版本發佈 (v1.0.0)
- 支持 v2.5.0 多張圖片生成功能測試