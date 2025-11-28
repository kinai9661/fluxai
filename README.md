# 🎨 AI Generator Ultimate (Cloudflare Worker)

[![Version](https://img.shields.io/badge/version-v2.16.0-blue?style=for-the-badge)](https://github.com/kinai9661/fluxai/releases)
[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Workers-orange?style=for-the-badge&logo=cloudflare)](https://deploy.workers.cloudflare.com/?url=https://github.com/kinai9661/fluxai)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)]()

> 🔥 **最強大的 Cloudflare Worker AI 生成器**
> *   **12 個免費模型**: Flux Pro, 1.1 Pro, Kontext Por... 全部免費！
> *   **API 自由切換**: 一鍵切換 Pollinations (免費) / Replicate (付費) / 自定義源。
> *   **歷史回溯**: 本地畫廊自動保存作品，一鍵復用參數重繪。
> *   **風格大師**: 19 種預設風格，讓提示詞秒變藝術品。

---

## ✨ 核心功能 (v2.16.0)

### 1. 🌐 API 提供商選擇器 (Multi-Provider)
不再受限於單一 API！通過全新的 **分頁式界面 (Tabs)**，你可以自由選擇：

| 通道 | 🆓 免費通道 (Pollinations) | 💎 專業通道 (Replicate) |
| :--- | :--- | :--- |
| **適用場景** | 日常創作、測試、無限生成 | 商業項目、極致畫質 |
| **模型數量** | **12 個** (全部免費) | **7+ 個** (官方付費) |
| **成本** | **$0 / 無限** | 按量付費 (積分) |
| **主要模型** | Flux Pro, 1.1 Pro, Kontext Por | Flux Pro (Official), Schnell |
| **多圖並發** | ✅ 支持 1-4 張 | ✅ 支持 1-4 張 |

### 2. 📜 歷史記錄畫廊 (History Gallery) `NEW`
*   **自動保存**: 每次生成的圖片都會自動保存在瀏覽器本地。
*   **網格預覽**: 精美的畫廊視圖，隨時回顧你的傑作。
*   **一鍵復用 (Reuse)**: 點擊歷史記錄中的 "♻️" 按鈕，自動填入當時的提示詞、模型和風格，方便重繪。
*   **隱私保護**: 數據僅存儲在你的本地瀏覽器 (localStorage)，不經過服務器。

### 3. ⚙️ 高級連接配置 `NEW`
*   **自定義端點**: 連接到任何兼容 OpenAI 格式的 API (如本地 Ollama, 其他 Worker)。
*   **認證管理**: 支持 Bearer Token 或 API Key。
*   **Pollinations 參數**: 自定義 `Referrer` 頭信息，優化統計或訪問權限。

### 4. 🎨 風格大師 (Style Master)
內置 **19 種** 精心調試的藝術風格，自動優化你的提示詞：
*   **二次元**: Anime (動漫), Manga (漫畫)
*   **寫實**: Realistic (照片級), 3D Render (3D渲染)
*   **藝術**: Oil Painting (油畫), Watercolor (水彩), Ukiyo-e (浮世繪)
*   **風格**: Cyberpunk (賽博朋克), Steampunk (蒸汽朋克)

---

## 🚀 快速部署

### 方式 1: 一鍵部署 (推薦)

直接點擊下方按鈕，登錄 Cloudflare 即可完成部署：

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kinai9661/fluxai)

### 方式 2: 手動部署

1.  **克隆倉庫**:
    ```
    git clone https://github.com/kinai9661/fluxai.git
    cd fluxai
    ```

2.  **安裝依賴**:
    ```
    npm install -g wrangler
    ```

3.  **部署到 Cloudflare**:
    ```
    wrangler deploy
    ```

---

## 📖 API 使用指南

本項目完全兼容 **OpenAI Chat Completions API** 格式。

### 端點 (Endpoint)
`POST https://your-worker.workers.dev/v1/chat/completions`

### 請求示例 (Python)

