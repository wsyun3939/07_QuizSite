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

    child_links = []
    # "グル分け"が含まれる<tr>行を探す
    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue
        if "グル分け" not in tr.get_text():
            continue

        # td内のすべての<a>タグからリンクを抽出
        for a in tr.find_all("a", href=True):
            if a.text.strip().startswith("☆"):
                child_links.append(a["href"])

    return child_links


def extract_grouping_problems(soup):
    trs = soup.find_all("tr")
    problems = []

    for row in trs:
        cells = row.find_all("td")
        if not cells or "グループ分けしなさい" not in cells[0].text:
            continue

        question_text = cells[0].get_text(strip=True)

        groups = []
        for cell in cells[1:]:
            lines = cell.get_text("\n").strip().split("\n")
            if len(lines) < 2:
                continue
            group_name = lines[0].replace("【", "").replace("】", "").strip()
            items = [line.strip() for line in lines[1:] if line.strip()]
            if group_name and items:
                groups.append([group_name] + items)

        if groups:
            problem = [[question_text], ["グループ数", str(len(groups))]] + groups
            problems.append(problem)

    return problems

def save_to_csv(folder, filename, problem_list):
    os.makedirs(folder, exist_ok=True)
    filepath = os.path.join(folder, filename)
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        for problem in problem_list:
            writer.writerows(problem)
            writer.writerow([])  # 問題区切り

    print(f"[書き出し] {filepath}（{len(problem_list)}問）")


def normalize_genre(genre_jp):
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

            m = re.search(r"(.+?)グループ分け.*?☆(\d+)", title)
            if not m:
                continue
            genre_jp_raw, level = m.groups()
            genre_en = normalize_genre(genre_jp_raw)
            if not genre_en:
                print(f"[スキップ] 未定義ジャンル: 『{genre_jp_raw}』")
                continue

            filename = f"GROUP_{level}.csv"
            folder = os.path.join(base_output_dir, genre_en)

            problems = extract_grouping_problems(soup)
            if problems:
                if folder not in grouped_data:
                    grouped_data[folder] = {}
                if filename not in grouped_data[folder]:
                    grouped_data[folder][filename] = []
                grouped_data[folder][filename].extend(problems)
                print(f"[{i+1}/{len(urls)}] {genre_en}/{filename} ← {len(problems)}問")
            time.sleep(1)
        except Exception as e:
            print(f"Error on {url}: {e}")

    for folder, files in grouped_data.items():
        for filename, problems in files.items():
            save_to_csv(folder, filename, problems)

# 実行
scrape_all(max_pages=None)
