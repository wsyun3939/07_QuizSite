import requests
from bs4 import BeautifulSoup
import csv
import os
import re
import time
import html

parent_url = "https://qmatenori.com/"
base_output_dir = "data"
os.makedirs(base_output_dir, exist_ok=True)

# 日本語ジャンル → 英語名マッピング
genre_map = {
    "アニメandゲーム": "animeandgame",
    "スポーツ": "sports",
    "ライフスタイル": "lifestyle",
    "芸能": "entertainment",
    "社会": "society",
    "文系学問": "humanities",
    "理系学問": "science"
}

def get_child_links():
    res = requests.get(parent_url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")
    return [
        a["href"] for a in soup.find_all("a", href=True)
        if a.text.strip().startswith("☆") and "4%e6%8a%9e" in a["href"]
    ]

def extract_problems(soup):
    trs = soup.find_all("tr")
    data = []
    i = 0
    while i < len(trs):
        tds = trs[i].find_all("td")
        if len(tds) == 3 and "rowspan" in tds[0].attrs:
            q = tds[0].get_text(strip=True)
            opt1 = tds[1].get_text(strip=True)
            ans = tds[2].get_text(strip=True)
            opts = [opt1]
            for j in range(1, 4):
                if i + j < len(trs):
                    sub_tds = trs[i + j].find_all("td")
                    if sub_tds:
                        opts.append(sub_tds[0].get_text(strip=True))
            if len(opts) == 4:
                data.append([
                    [q, opts[0], ans, "", ""],
                    ["", opts[1], ""],
                    ["", opts[2], ""],
                    ["", opts[3], ""]
                ])
            i += 4
        else:
            i += 1
    return data

def save_to_csv(folder, filename, problem_list):
    os.makedirs(folder, exist_ok=True)
    filepath = os.path.join(folder, filename)
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        for block in problem_list:
            writer.writerows(block)

def normalize_genre(genre_jp, level):
    genre_jp = html.unescape(genre_jp).strip()
    genre_jp = genre_jp.replace("＆", "and").replace("&", "and")
    return genre_map.get(genre_jp)

def scrape_all(max_pages=None):
    urls = get_child_links()
    if max_pages:
        urls = urls[:max_pages]

    grouped_data = {}

    for i, url in enumerate(urls):
        try:
            res = requests.get(url)
            res.encoding = res.apparent_encoding
            soup = BeautifulSoup(res.text, "html.parser")
            title = soup.find("title").get_text(strip=True)
            title = html.unescape(title)

            m = re.search(r"(.+?)\s*4択\s*☆(\d+)", title)
            if not m:
                continue
            genre_jp_raw, level = m.groups()
            genre_en = normalize_genre(genre_jp_raw, level)
            if not genre_en:
                print(f"[スキップ] 未定義のジャンル: 『{genre_jp_raw}』 → 正規化後: 『{genre_jp_raw.replace('＆','and').replace('&','and')}』")
                continue

            filename = f"MCQ_{level}.csv"
            folder = os.path.join(base_output_dir, genre_en)

            problems = extract_problems(soup)
            if problems:
                if folder not in grouped_data:
                    grouped_data[folder] = {}
                if filename not in grouped_data[folder]:
                    grouped_data[folder][filename] = []
                grouped_data[folder][filename].extend(problems)
                print(f"[{i+1}/{len(urls)}] {genre_en}/{filename} ← {len(problems)}問抽出")
            time.sleep(1)
        except Exception as e:
            print(f"Error on {url}: {e}")

    for folder, files in grouped_data.items():
        for filename, problems in files.items():
            save_to_csv(folder, filename, problems)

# 実行（最大10ページ）
scrape_all(max_pages=None)
