import requests
from bs4 import BeautifulSoup
import csv

url = "https://qmatenori.com/2020/07/17/%e3%82%a2%e3%83%8b%e3%83%a1%e3%82%b2%e3%83%bc%e3%83%a0-4%e6%8a%9e-%e2%98%861/"

response = requests.get(url)
response.encoding = response.apparent_encoding  # 文字化け対策
soup = BeautifulSoup(response.text, "html.parser")

output_rows = []

# テーブル行を順番に処理
trs = soup.find_all("tr")
i = 0
while i < len(trs):
    tds = trs[i].find_all("td")
    if len(tds) == 3 and "rowspan" in tds[0].attrs:
        question = tds[0].get_text(strip=True)
        choice1 = tds[1].get_text(strip=True)
        correct = tds[2].get_text(strip=True)
        choices = [choice1]

        # 次の3行で残りの選択肢を取得
        for j in range(1, 4):
            next_tr = trs[i + j]
            next_tds = next_tr.find_all("td")
            choice = next_tds[0].get_text(strip=True)
            choices.append(choice)

        # CSVの4行構成にする
        output_rows.append([question, choices[0], correct, "", ""])
        output_rows.append(["", choices[1], ""])
        output_rows.append(["", choices[2], ""])
        output_rows.append(["", choices[3], ""])

        i += 4  # 次の問題へ
    else:
        i += 1

# 保存
with open("anime_quiz.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(output_rows)

print("書き出し完了：anime_quiz.csv")
