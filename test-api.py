#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Generator 2API - Python 測試套件
版本: 1.0.0
測試 v2.5.0 多張圖片生成功能
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional

# 配置
WORKER_URL = "https://ai-generator-2api-cfwork.kinai9661.workers.dev"
API_KEY = "1"  # 替換為你的實際 API 密鑰

# ANSI 顏色碼
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    MAGENTA = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    RESET = '\033[0m'

class TestRunner:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
        
    def print_header(self):
        print(f"{Colors.CYAN}" + "="*70)
        print(f"  AI Generator 2API - 測試套件 v1.0.0")
        print(f"  測試目標: {self.base_url}")
        print(f"  開始時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70 + f"{Colors.RESET}\n")
    
    def test_api(self, test_name: str, endpoint: str, payload: Dict, 
                 expected_images: int, method: str = "POST") -> bool:
        """""執行 API 測試"""""
        self.total_tests += 1
        test_num = self.total_tests
        
        print(f"\n{Colors.BLUE}[測試 {test_num}]{Colors.RESET} {test_name}")
        print(f"{Colors.YELLOW}端點:{Colors.RESET} {endpoint}")
        print(f"{Colors.YELLOW}預期圖片數:{Colors.RESET} {expected_images} 張")
        print("執行中...", end="", flush=True)
        
        start_time = time.time()
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            if method == "POST":
                response = requests.post(
                    f"{self.base_url}{endpoint}",
                    headers=headers,
                    json=payload,
                    timeout=120
                )
            else:
                response = requests.get(
                    f"{self.base_url}{endpoint}",
                    headers=headers,
                    timeout=30
                )
            
            elapsed_time = time.time() - start_time
            
            # 檢查 HTTP 狀態碼
            if response.status_code != 200:
                print(f"\r{Colors.RED}✗ 失敗{Colors.RESET} - HTTP {response.status_code}")
                print(f"{Colors.RED}錯誤響應:{Colors.RESET}")
                try:
                    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
                except:
                    print(response.text)
                
                self.failed_tests += 1
                self.test_results.append({
                    "test_num": test_num,
                    "name": test_name,
                    "status": "failed",
                    "error": f"HTTP {response.status_code}",
                    "time": elapsed_time
                })
                return False
            
            # 解析響應
            data = response.json()
            
            # 計算圖片數量
            image_count = 0
            image_urls = []
            
            # Images API 格式
            if 'data' in data and isinstance(data['data'], list):
                image_count = len(data['data'])
                image_urls = [item.get('url', '') for item in data['data']]
            
            # Chat API 格式
            elif 'choices' in data:
                content = data['choices'][0].get('message', {}).get('content', '')
                image_urls = [url for url in content.split('](') if url.startswith('http')]
                image_urls = [url.rstrip(')') for url in image_urls]
                image_count = len(image_urls)
            
            # 驗證結果
            if image_count == expected_images:
                print(f"\r{Colors.GREEN}✓ 通過{Colors.RESET} - "
                      f"成功生成 {image_count} 張圖片 "
                      f"({elapsed_time:.2f}s)")
                
                # 顯示部分 URL
                if image_urls:
                    print(f"{Colors.CYAN}圖片 URL (部分):{Colors.RESET}")
                    for url in image_urls[:2]:
                        print(f"  → {url}")
                
                self.passed_tests += 1
                self.test_results.append({
                    "test_num": test_num,
                    "name": test_name,
                    "status": "passed",
                    "image_count": image_count,
                    "time": elapsed_time,
                    "urls": image_urls
                })
                return True
            else:
                print(f"\r{Colors.RED}✗ 失敗{Colors.RESET} - "
                      f"預期 {expected_images} 張,實際 {image_count} 張")
                
                self.failed_tests += 1
                self.test_results.append({
                    "test_num": test_num,
                    "name": test_name,
                    "status": "failed",
                    "error": f"Expected {expected_images}, got {image_count}",
                    "time": elapsed_time
                })
                return False
                
        except requests.exceptions.Timeout:
            print(f"\r{Colors.RED}✗ 失敗{Colors.RESET} - 請求超時")
            self.failed_tests += 1
            self.test_results.append({
                "test_num": test_num,
                "name": test_name,
                "status": "failed",
                "error": "Timeout"
            })
            return False
            
        except Exception as e:
            print(f"\r{Colors.RED}✗ 失敗{Colors.RESET} - {str(e)}")
            self.failed_tests += 1
            self.test_results.append({
                "test_num": test_num,
                "name": test_name,
                "status": "failed",
                "error": str(e)
            })
            return False
    
    def run_all_tests(self):
        """"""執行所有測試"""""
        self.print_header()
        
        # 測試組 1: Images API
        print(f"\n{Colors.MAGENTA}▶ 測試組 1: Images API 端點{Colors.RESET}")
        print("-" * 70)
        
        self.test_api(
            "單張圖片生成 (1:1)",
            "/v1/images/generations",
            {
                "prompt": "a cute cat wearing sunglasses, photorealistic",
                "n": 1,
                "size": "1024x1024"
            },
            1
        )
        time.sleep(2)
        
        self.test_api(
            "兩張圖片生成 (16:9)",
            "/v1/images/generations",
            {
                "prompt": "futuristic city with neon lights, cyberpunk style",
                "n": 2,
                "size": "1792x1024"
            },
            2
        )
        time.sleep(2)
        
        self.test_api(
            "三張圖片生成 (9:16)",
            "/v1/images/generations",
            {
                "prompt": "beautiful mountain landscape at sunset",
                "n": 3,
                "size": "1024x1792"
            },
            3
        )
        time.sleep(2)
        
        self.test_api(
            "四張圖片生成 - 最大限制",
            "/v1/images/generations",
            {
                "prompt": "fantasy dragon flying over castle, 4 different angles",
                "n": 4,
                "size": "1024x1024"
            },
            4
        )
        
        # 測試組 2: Chat API
        print(f"\n{Colors.MAGENTA}▶ 測試組 2: Chat Completions API 端點{Colors.RESET}")
        print("-" * 70)
        
        time.sleep(2)
        self.test_api(
            "Chat API - 單張圖片",
            "/v1/chat/completions",
            {
                "model": "flux-schnell",
                "messages": [{"role": "user", "content": "a red sports car on a mountain road"}],
                "n": 1,
                "stream": False
            },
            1
        )
        
        time.sleep(2)
        self.test_api(
            "Chat API - 兩張圖片",
            "/v1/chat/completions",
            {
                "model": "flux-schnell",
                "messages": [{"role": "user", "content": "astronaut floating in space"}],
                "n": 2,
                "aspect_ratio": "16:9",
                "stream": False
            },
            2
        )
        
        time.sleep(2)
        self.test_api(
            "Chat API - 四張圖片 (最大值)",
            "/v1/chat/completions",
            {
                "model": "flux-schnell",
                "messages": [{"role": "user", "content": "magical forest with glowing mushrooms"}],
                "n": 4,
                "aspect_ratio": "1:1",
                "stream": False
            },
            4
        )
        
        # 測試組 3: 邊界條件
        print(f"\n{Colors.MAGENTA}▶ 測試組 3: 邊界條件測試{Colors.RESET}")
        print("-" * 70)
        
        time.sleep(2)
        self.test_api(
            "超過最大值測試 (請求10張,應返回4張)",
            "/v1/images/generations",
            {
                "prompt": "test image generation limit",
                "n": 10,
                "size": "1024x1024"
            },
            4
        )
        
        time.sleep(2)
        self.test_api(
            "不同比例測試 (4:3)",
            "/v1/chat/completions",
            {
                "model": "flux-schnell",
                "messages": [{"role": "user", "content": "landscape photography"}],
                "n": 2,
                "aspect_ratio": "4:3",
                "stream": False
            },
            2
        )
        
        # 測試組 4: 模型列表
        print(f"\n{Colors.MAGENTA}▶ 測試組 4: 模型列表端點{Colors.RESET}")
        print("-" * 70)
        
        self.total_tests += 1
        test_num = self.total_tests
        print(f"\n{Colors.BLUE}[測試 {test_num}]{Colors.RESET} 獲取模型列表")
        print("執行中...", end="", flush=True)
        
        try:
            response = requests.get(
                f"{self.base_url}/v1/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                model_count = len(data.get('data', []))
                print(f"\r{Colors.GREEN}✓ 通過{Colors.RESET} - 返回 {model_count} 個模型")
                print(f"{Colors.CYAN}模型列表:{Colors.RESET}")
                for model in data.get('data', []):
                    print(f"  → {model.get('id', 'unknown')}")
                self.passed_tests += 1
            else:
                print(f"\r{Colors.RED}✗ 失敗{Colors.RESET} - HTTP {response.status_code}")
                self.failed_tests += 1
        except Exception as e:
            print(f"\r{Colors.RED}✗ 失敗{Colors.RESET} - {str(e)}")
            self.failed_tests += 1
    
    def print_summary(self):
        """"""列印測試結果摘要"""""
        print(f"\n{Colors.CYAN}" + "="*70)
        print(f"  測試結果摘要")
        print("="*70 + f"{Colors.RESET}")
        print(f"總測試數: {Colors.BLUE}{self.total_tests}{Colors.RESET}")
        print(f"通過: {Colors.GREEN}{self.passed_tests}{Colors.RESET}")
        print(f"失敗: {Colors.RED}{self.failed_tests}{Colors.RESET}")
        
        if self.failed_tests == 0:
            print(f"\n{Colors.GREEN}🎉 所有測試通過!{Colors.RESET}")
        else:
            success_rate = (self.passed_tests * 100) // self.total_tests
            print(f"\n成功率: {Colors.YELLOW}{success_rate}%{Colors.RESET}")
            print(f"{Colors.RED}⚠️  存在失敗的測試{Colors.RESET}")
        
        # 保存結果為 JSON
        result_file = f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total": self.total_tests,
                "passed": self.passed_tests,
                "failed": self.failed_tests,
                "results": self.test_results
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\n詳細結果已保存至: {Colors.CYAN}{result_file}{Colors.RESET}")

if __name__ == "__main__":
    print(f"{Colors.WHITE}正在初始化測試環境...{Colors.RESET}")
    
    runner = TestRunner(WORKER_URL, API_KEY)
    
    try:
        runner.run_all_tests()
        runner.print_summary()
        
        sys.exit(0 if runner.failed_tests == 0 else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}測試被用戶中斷{Colors.RESET}")
        runner.print_summary()
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}系統錯誤: {str(e)}{Colors.RESET}")
        sys.exit(1)