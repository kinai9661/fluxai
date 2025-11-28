#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=================================================================================
AI Generator Multi-Model API 測試腳本 v2.12.0

測試範圍:
- 12 個 Pollinations 免費模型 (含 Flux Pro, Kontext Por)
- 19 種藝術風格
- 多圖生成 (1-4張)
- 安全/藝術模式
- 不同圖片比例
- API 端點功能

使用方法:
    pip install requests colorama
    python3 test-api.py

作者: 首席AI執行官
日期: 2025-11-28
=================================================================================
"""

import requests
import json
import time
from datetime import datetime
import sys

try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLOR = True
except ImportError:
    HAS_COLOR = False
    print("提示: 安裝 colorama 可獲得彩色輸出 (pip install colorama)")
    print()

# ============================================================================
# 配置區域 - 請修改這裡
# ============================================================================

API_BASE = "https://your-worker.workers.dev"  # ⚠️ 修改為你的 Worker 地址
API_KEY = "1"  # ⚠️ 修改為你的 API 密鑰

# 測試配置
CONFIG = {
    "run_basic_tests": True,      # 基礎功能測試
    "run_model_tests": True,      # 所有模型測試
    "run_style_tests": True,      # 所有風格測試
    "run_batch_tests": True,      # 批量生成測試
    "run_advanced_tests": True,   # 進階功能測試
    "save_results": True,         # 保存測試結果
    "delay_between_tests": 2,     # 測試間隔(秒)
    "quick_mode": False           # 快速模式(只測試關鍵功能)
}

# ============================================================================
# 測試數據
# ============================================================================

# 12 個 Pollinations 免費模型
POLLINATIONS_MODELS = [
    # 基礎模型
    {"id": "pollinations-turbo", "name": "Turbo", "category": "基礎", "emoji": "⚡"},
    {"id": "pollinations-flux", "name": "Flux", "category": "基礎", "emoji": "🚀"},
    
    # 專業模型
    {"id": "pollinations-flux-pro", "name": "Flux Pro ⭐", "category": "專業", "emoji": "💎"},
    {"id": "pollinations-flux-1.1-pro", "name": "Flux 1.1 Pro", "category": "專業", "emoji": "🔥"},
    {"id": "pollinations-flux-realism", "name": "Flux Realism", "category": "專業", "emoji": "📸"},
    
    # 特化模型
    {"id": "pollinations-flux-anime", "name": "Flux Anime", "category": "特化", "emoji": "🎌"},
    {"id": "pollinations-flux-3d", "name": "Flux 3D", "category": "特化", "emoji": "🎭"},
    {"id": "pollinations-flux-kontext", "name": "Flux Kontext", "category": "特化", "emoji": "🎯"},
    {"id": "pollinations-flux-kontext-por", "name": "Kontext Por", "category": "特化", "emoji": "🔥"},
    
    # 實驗模型
    {"id": "pollinations-flux-cablyai", "name": "CablyAI", "category": "實驗", "emoji": "🤖"},
    {"id": "pollinations-any-dark", "name": "Any Dark", "category": "實驗", "emoji": "🌙"},
    {"id": "pollinations-midjourney", "name": "MJ Style", "category": "實驗", "emoji": "🎨"}
]

# 19 種藝術風格
ART_STYLES = [
    {"id": "auto", "name": "自動", "emoji": "🤖"},
    {"id": "anime", "name": "日本動漫", "emoji": "🎌"},
    {"id": "manga", "name": "日本漫畫", "emoji": "📖"},
    {"id": "realistic", "name": "寫實照片", "emoji": "📸"},
    {"id": "oil-painting", "name": "油畫", "emoji": "🖼️"},
    {"id": "watercolor", "name": "水彩畫", "emoji": "💧"},
    {"id": "cyberpunk", "name": "賽博朋克", "emoji": "🤖"},
    {"id": "fantasy", "name": "奇幻藝術", "emoji": "✨"},
    {"id": "sketch", "name": "素描", "emoji": "✏️"},
    {"id": "3d-render", "name": "3D渲染", "emoji": "🎭"},
    {"id": "pixel-art", "name": "像素藝術", "emoji": "🕹️"},
    {"id": "comic", "name": "美式漫畫", "emoji": "🦸"},
    {"id": "impressionism", "name": "印象派", "emoji": "🌸"},
    {"id": "art-nouveau", "name": "新藝術", "emoji": "🎨"},
    {"id": "steampunk", "name": "蒸汽朋克", "emoji": "⚙️"},
    {"id": "minimalist", "name": "極簡主義", "emoji": "📐"},
    {"id": "surreal", "name": "超現實", "emoji": "🎪"},
    {"id": "chinese-ink", "name": "中國水墨", "emoji": "🖌️"},
    {"id": "ukiyo-e", "name": "浮世繪", "emoji": "🌊"}
]

# ============================================================================
# 輔助函數
# ============================================================================

def print_color(text, color="white", bold=False):
    """彩色輸出"""
    if not HAS_COLOR:
        print(text)
        return
    
    colors = {
        "red": Fore.RED,
        "green": Fore.GREEN,
        "yellow": Fore.YELLOW,
        "blue": Fore.BLUE,
        "magenta": Fore.MAGENTA,
        "cyan": Fore.CYAN,
        "white": Fore.WHITE
    }
    
    style = Style.BRIGHT if bold else Style.NORMAL
    print(f"{style}{colors.get(color, Fore.WHITE)}{text}{Style.RESET_ALL}")

def print_header(text):
    """打印標題"""
    print()
    print_color("=" * 80, "cyan", True)
    print_color(f"  {text}", "cyan", True)
    print_color("=" * 80, "cyan", True)
    print()

def print_success(text):
    """成功消息"""
    print_color(f"✅ {text}", "green")

def print_error(text):
    """錯誤消息"""
    print_color(f"❌ {text}", "red")

def print_info(text):
    """信息消息"""
    print_color(f"ℹ️  {text}", "blue")

def print_warning(text):
    """警告消息"""
    print_color(f"⚠️  {text}", "yellow")

# ============================================================================
# API 調用函數
# ============================================================================

def call_api(endpoint, payload, timeout=120):
    """調用 API"""
    url = f"{API_BASE}{endpoint}"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=timeout)
        return {
            "success": response.ok,
            "status": response.status_code,
            "data": response.json() if response.ok else None,
            "error": response.text if not response.ok else None
        }
    except Exception as e:
        return {
            "success": False,
            "status": 0,
            "data": None,
            "error": str(e)
        }

def get_models():
    """獲取模型列表"""
    try:
        response = requests.get(f"{API_BASE}/v1/models")
        if response.ok:
            return response.json().get('data', [])
        return []
    except:
        return []

def get_styles():
    """獲取風格列表"""
    try:
        response = requests.get(f"{API_BASE}/v1/styles")
        if response.ok:
            return response.json().get('data', [])
        return []
    except:
        return []

# ============================================================================
# 測試結果類
# ============================================================================

class TestResults:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.details = []
        self.start_time = datetime.now()
    
    def add_result(self, test_name, success, details=""):
        self.total += 1
        if success:
            self.passed += 1
            print_success(f"{test_name}")
        else:
            self.failed += 1
            print_error(f"{test_name}")
            if details:
                print_error(f"   詳情: {details}")
        
        self.details.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    def print_summary(self):
        duration = (datetime.now() - self.start_time).total_seconds()
        print_header("測試總結")
        print_info(f"總測試數: {self.total}")
        print_success(f"通過: {self.passed}")
        if self.failed > 0:
            print_error(f"失敗: {self.failed}")
        else:
            print_success(f"失敗: {self.failed}")
        print_info(f"成功率: {(self.passed/self.total*100):.1f}%")
        print_info(f"總耗時: {duration:.2f} 秒")
        print()
    
    def save_to_file(self, filename="test-results.json"):
        report = {
            "test_time": self.start_time.isoformat(),
            "duration_seconds": (datetime.now() - self.start_time).total_seconds(),
            "api_version": "v2.12.0",
            "summary": {
                "total": self.total,
                "passed": self.passed,
                "failed": self.failed,
                "success_rate": f"{(self.passed/self.total*100):.1f}%"
            },
            "details": self.details
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print_success(f"測試報告已保存到: {filename}")

# ============================================================================
# 測試函數
# ============================================================================

def test_basic_connection(results):
    """測試 1: 基礎連接"""
    print_header("測試 1: 基礎連接")
    
    try:
        response = requests.get(f"{API_BASE}/v1/models", timeout=10)
        results.add_result(
            "基礎連接測試",
            response.ok,
            f"狀態碼: {response.status_code}"
        )
    except Exception as e:
        results.add_result("基礎連接測試", False, str(e))

def test_get_models(results):
    """測試 2: 獲取模型列表"""
    print_header("測試 2: 獲取模型列表")
    
    models = get_models()
    free_models = [m for m in models if m.get('isFree')]
    
    print_info(f"總模型數: {len(models)}")
    print_info(f"免費模型: {len(free_models)}")
    print_info(f"付費模型: {len(models) - len(free_models)}")
    print()
    
    # 顯示所有免費模型
    if free_models:
        print_info("免費模型列表:")
        for model in free_models:
            category = model.get('category', '未知')
            print(f"  • {model['id']} ({category})")
        print()
    
    results.add_result(
        "獲取模型列表",
        len(models) > 0,
        f"共 {len(models)} 個模型"
    )
    
    # 驗證 Pollinations 模型數量
    results.add_result(
        "Pollinations 模型數量",
        len(free_models) >= 12,
        f"預期 ≥12, 實際 {len(free_models)}"
    )
    
    # 檢查關鍵模型
    model_ids = [m['id'] for m in models]
    key_models = [
        ("pollinations-flux-pro", "Flux Pro"),
        ("pollinations-flux-1.1-pro", "Flux 1.1 Pro"),
        ("pollinations-flux-kontext-por", "Kontext Por")
    ]
    
    for model_id, model_name in key_models:
        exists = model_id in model_ids
        results.add_result(
            f"關鍵模型: {model_name}",
            exists,
            f"模型ID: {model_id}"
        )

def test_get_styles(results):
    """測試 3: 獲取風格列表"""
    print_header("測試 3: 獲取風格列表")
    
    styles = get_styles()
    
    print_info(f"總風格數: {len(styles)}")
    
    if styles:
        print_info("風格列表:")
        for style in styles[:5]:  # 只顯示前5個
            print(f"  • {style['id']} - {style['name']}")
        if len(styles) > 5:
            print(f"  ... 還有 {len(styles) - 5} 個風格")
        print()
    
    results.add_result(
        "獲取風格列表",
        len(styles) >= 19,
        f"預期 ≥19, 實際 {len(styles)}"
    )

def test_pollinations_models(results):
    """測試 4: 測試所有 Pollinations 模型"""
    print_header("測試 4: 測試 12 個 Pollinations 免費模型")
    
    if CONFIG["quick_mode"]:
        print_warning("快速模式: 僅測試關鍵模型")
        test_models = [m for m in POLLINATIONS_MODELS if "pro" in m["id"] or "kontext" in m["id"]]
    else:
        test_models = POLLINATIONS_MODELS
    
    for i, model_info in enumerate(test_models, 1):
        model_id = model_info["id"]
        model_name = model_info["name"]
        category = model_info["category"]
        emoji = model_info["emoji"]
        
        print_info(f"[{i}/{len(test_models)}] {emoji} 測試 {model_name} ({category})...")
        
        payload = {
            "model": model_id,
            "prompt": "a cute cat",
            "style": "auto",
            "n": 1,
            "aspect_ratio": "1:1",
            "safe_mode": True
        }
        
        result = call_api("/v1/images/generations", payload)
        
        if result["success"]:
            image_count = len(result["data"].get("data", []))
            results.add_result(
                f"模型測試: {model_name}",
                image_count > 0,
                f"生成 {image_count} 張圖片"
            )
        else:
            results.add_result(
                f"模型測試: {model_name}",
                False,
                result["error"][:100] if result["error"] else "Unknown error"
            )
        
        time.sleep(CONFIG["delay_between_tests"])

def test_art_styles(results):
    """測試 5: 測試所有藝術風格"""
    print_header("測試 5: 測試 19 種藝術風格")
    
    # 使用 Flux Pro 測試所有風格
    test_model = "pollinations-flux-pro"
    print_info(f"使用模型: {test_model}")
    print()
    
    if CONFIG["quick_mode"]:
        print_warning("快速模式: 僅測試部分風格")
        test_styles = ART_STYLES[:5]
    else:
        test_styles = ART_STYLES
    
    for i, style_info in enumerate(test_styles, 1):
        style_id = style_info["id"]
        style_name = style_info["name"]
        emoji = style_info["emoji"]
        
        print_info(f"[{i}/{len(test_styles)}] {emoji} 測試風格: {style_name}...")
        
        payload = {
            "model": test_model,
            "prompt": "a beautiful landscape",
            "style": style_id,
            "n": 1
        }
        
        result = call_api("/v1/images/generations", payload)
        
        if result["success"]:
            image_count = len(result["data"].get("data", []))
            results.add_result(
                f"風格測試: {style_name}",
                image_count > 0,
                f"使用 Flux Pro"
            )
        else:
            results.add_result(
                f"風格測試: {style_name}",
                False,
                result["error"][:100] if result["error"] else "Unknown error"
            )
        
        time.sleep(CONFIG["delay_between_tests"])

def test_batch_generation(results):
    """測試 6: 批量生成測試"""
    print_header("測試 6: 批量生成測試 (1-4張)")
    
    for n in [1, 2, 3, 4]:
        print_info(f"測試生成 {n} 張圖片...")
        
        payload = {
            "model": "pollinations-flux",
            "prompt": "a beautiful sunset",
            "style": "realistic",
            "n": n
        }
        
        result = call_api("/v1/images/generations", payload)
        
        if result["success"]:
            image_count = len(result["data"].get("data", []))
            results.add_result(
                f"批量生成 {n} 張",
                image_count == n,
                f"預期 {n} 張, 實際 {image_count} 張"
            )
        else:
            results.add_result(
                f"批量生成 {n} 張",
                False,
                result["error"][:100] if result["error"] else "Unknown error"
            )
        
        time.sleep(CONFIG["delay_between_tests"])

def test_advanced_features(results):
    """測試 7: 進階功能測試"""
    print_header("測試 7: 進階功能測試")
    
    # 測試 7.1: 不同比例
    print_info("測試 7.1: 不同圖片比例...")
    ratios = ["1:1", "16:9", "9:16", "4:3", "3:4"]
    
    for ratio in ratios:
        payload = {
            "model": "pollinations-flux",
            "prompt": "test image",
            "aspect_ratio": ratio,
            "n": 1
        }
        
        result = call_api("/v1/images/generations", payload)
        results.add_result(
            f"圖片比例 {ratio}",
            result["success"],
            "" if result["success"] else result["error"][:100]
        )
        time.sleep(1)
    
    # 測試 7.2: 安全模式切換
    print()
    print_info("測試 7.2: 安全模式切換...")
    
    for safe_mode in [True, False]:
        mode_text = "安全" if safe_mode else "藝術"
        payload = {
            "model": "pollinations-flux",
            "prompt": "artistic portrait",
            "safe_mode": safe_mode,
            "n": 1
        }
        
        result = call_api("/v1/images/generations", payload)
        results.add_result(
            f"{mode_text}模式測試",
            result["success"],
            "" if result["success"] else result["error"][:100]
        )
        time.sleep(1)

def test_flagship_models(results):
    """測試 8: 旗艦模型深度測試"""
    print_header("測試 8: 旗艦模型深度測試")
    
    flagship_tests = [
        {
            "name": "💎 Flux Pro 專業測試",
            "model": "pollinations-flux-pro",
            "prompt": "professional studio portrait of a woman",
            "style": "realistic",
            "n": 2
        },
        {
            "name": "🔥 Flux 1.1 Pro 最新版測試",
            "model": "pollinations-flux-1.1-pro",
            "prompt": "futuristic cityscape at night",
            "style": "cyberpunk",
            "n": 2
        },
        {
            "name": "🎯 Kontext Por 情境測試",
            "model": "pollinations-flux-kontext-por",
            "prompt": "a girl reading in a cozy cafe, rain outside, warm lighting",
            "style": "realistic",
            "safe_mode": False,
            "n": 2
        },
        {
            "name": "🎌 Flux Anime 動漫測試",
            "model": "pollinations-flux-anime",
            "prompt": "magical girl with big eyes",
            "style": "anime",
            "n": 4
        }
    ]
    
    for test in flagship_tests:
        test_name = test.pop("name")
        print_info(f"測試: {test_name}...")
        
        result = call_api("/v1/images/generations", test)
        
        if result["success"]:
            image_count = len(result["data"].get("data", []))
            results.add_result(
                test_name,
                image_count > 0,
                f"生成 {image_count} 張圖片"
            )
        else:
            results.add_result(
                test_name,
                False,
                result["error"][:100] if result["error"] else "Unknown error"
            )
        
        time.sleep(CONFIG["delay_between_tests"])

def test_style_model_combinations(results):
    """測試 9: 風格+模型組合測試"""
    print_header("測試 9: 風格+模型最佳組合")
    
    combinations = [
        {"model": "pollinations-flux-anime", "style": "anime", "name": "🎌 動漫+動漫風格"},
        {"model": "pollinations-flux-realism", "style": "realistic", "name": "📸 寫實+寫實風格"},
        {"model": "pollinations-flux-3d", "style": "3d-render", "name": "🎭 3D+3D風格"},
        {"model": "pollinations-flux-kontext-por", "style": "fantasy", "name": "✨ Kontext+奇幻"},
        {"model": "pollinations-any-dark", "style": "cyberpunk", "name": "🌙 暗黑+賽博朋克"}
    ]
    
    for combo in combinations:
        print_info(f"測試組合: {combo['name']}...")
        
        payload = {
            "model": combo["model"],
            "prompt": "masterpiece artwork",
            "style": combo["style"],
            "n": 1
        }
        
        result = call_api("/v1/images/generations", payload)
        
        results.add_result(
            combo["name"],
            result["success"],
            "" if result["success"] else result["error"][:100]
        )
        
        time.sleep(CONFIG["delay_between_tests"])

def test_category_models(results):
    """測試 10: 按分類測試模型"""
    print_header("測試 10: 按分類測試模型")
    
    categories = {}
    for model in POLLINATIONS_MODELS:
        cat = model["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(model)
    
    for cat_name, models in categories.items():
        print_info(f"\n測試 {cat_name} 類別 ({len(models)} 個模型)...")
        
        # 每個分類測試一個代表
        model = models[0]
        payload = {
            "model": model["id"],
            "prompt": "test artwork",
            "n": 1
        }
        
        result = call_api("/v1/images/generations", payload)
        results.add_result(
            f"{cat_name}類別測試 ({model['name']})",
            result["success"],
            "" if result["success"] else result["error"][:100]
        )
        
        time.sleep(1)

# ============================================================================
# 主程序
# ============================================================================

def main():
    print_color("", "cyan")
    print_color("╔" + "═" * 78 + "╗", "cyan", True)
    print_color("║" + " " * 78 + "║", "cyan", True)
    print_color("║" + "      🎨 AI Generator Multi-Model API 測試腳本 v2.12.0 🎨      ".center(78) + "║", "cyan", True)
    print_color("║" + " " * 78 + "║", "cyan", True)
    print_color("║" + "           測試 12 個免費模型 · 19 種藝術風格           ".center(78) + "║", "cyan", True)
    print_color("║" + "              含 Flux Pro · Kontext Por · 1.1 Pro              ".center(78) + "║", "cyan", True)
    print_color("║" + " " * 78 + "║", "cyan", True)
    print_color("╚" + "═" * 78 + "╝", "cyan", True)
    print()
    
    # 檢查配置
    if API_BASE == "https://your-worker.workers.dev":
        print_error("⚠️  請先修改 API_BASE 為你的 Worker 地址!")
        print_info("在腳本開頭找到 API_BASE 並修改為你的實際地址")
        print_info("例如: API_BASE = 'https://my-ai-gen.my-subdomain.workers.dev'")
        print()
        return
    
    print_info(f"API 地址: {API_BASE}")
    print_info(f"API 密鑰: {'*' * (len(API_KEY) - 4) + API_KEY[-4:] if len(API_KEY) > 4 else API_KEY}")
    print_info(f"測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_info(f"快速模式: {'開啟' if CONFIG['quick_mode'] else '關閉'}")
    print()
    
    if CONFIG["quick_mode"]:
        print_warning("快速模式已開啟,將只測試關鍵功能")
    
    try:
        input("按 Enter 開始測試...")
    except:
        pass
    
    results = TestResults()
    
    try:
        # 基礎測試
        if CONFIG["run_basic_tests"]:
            test_basic_connection(results)
            test_get_models(results)
            test_get_styles(results)
        
        # 模型測試
        if CONFIG["run_model_tests"]:
            test_pollinations_models(results)
            test_category_models(results)
        
        # 風格測試
        if CONFIG["run_style_tests"]:
            test_art_styles(results)
        
        # 批量測試
        if CONFIG["run_batch_tests"]:
            test_batch_generation(results)
        
        # 進階測試
        if CONFIG["run_advanced_tests"]:
            test_advanced_features(results)
            test_flagship_models(results)
            test_style_model_combinations(results)
        
    except KeyboardInterrupt:
        print()
        print_warning("測試被用戶中斷")
    except Exception as e:
        print_error(f"測試過程發生錯誤: {e}")
    
    # 輸出總結
    results.print_summary()
    
    # 保存結果
    if CONFIG["save_results"]:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"test-results-v2.12.0-{timestamp}.json"
        results.save_to_file(filename)
    
    # 最終評價
    print_header("最終評價")
    
    if results.failed == 0:
        print_color("🎉 恭喜! 所有測試通過! 🎉", "green", True)
        print_color("你的 API 工作完美,可以投入生產使用!", "green")
        print_color("\n✨ 12個免費模型全部可用!", "green")
        print_color("💎 包括 Flux Pro, 1.1 Pro, Kontext Por!", "green")
    elif results.passed / results.total > 0.8:
        print_color("✅ 良好! 大部分測試通過!", "yellow", True)
        print_color(f"通過率 {(results.passed/results.total*100):.1f}%, 建議檢查失敗項目", "yellow")
    else:
        print_color("⚠️  需要注意! 部分測試失敗", "red", True)
        print_color("請檢查配置和網絡連接", "red")
    
    print()
    print_info("📊 測試統計:")
    print(f"  • 總測試: {results.total}")
    print(f"  • 通過: {results.passed} ✅")
    print(f"  • 失敗: {results.failed} ❌")
    print(f"  • 成功率: {(results.passed/results.total*100):.1f}%")
    print()

if __name__ == "__main__":
    main()