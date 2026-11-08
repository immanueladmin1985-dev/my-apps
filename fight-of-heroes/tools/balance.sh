#!/usr/bin/env bash
# 밸런스 측정을 여러 프로세스로 나눠 돌리고 결과를 합친다.
# 사용: GODOT=/경로/godot tools/balance.sh [판 수=120] [프로세스 수=CPU 수] [첫 판 번호=0]
set -u
GODOT=${GODOT:-godot}
GAMES=${1:-120}
JOBS=${2:-$(nproc 2>/dev/null || echo 2)}
FIRST=${3:-0}
cd "$(dirname "$0")/.."
"$GODOT" --headless --path . --import >/dev/null 2>&1
tmp=$(mktemp -d)
per=$(( (GAMES + JOBS - 1) / JOBS ))
start=$FIRST
end=$(( FIRST + GAMES ))
i=0
while [ $start -lt $end ]; do
	n=$per
	[ $(( start + n )) -gt $end ] && n=$(( end - start ))
	"$GODOT" --headless --path . --fixed-fps 60 res://tests/test_runner.tscn -- --balance --games=$n --first=$start > "$tmp/$i.txt" 2>&1 &
	start=$(( start + n ))
	i=$(( i + 1 ))
done
wait
errors=$(cat "$tmp"/*.txt | grep -cE "SCRIPT ERROR|^ERROR:")
cat "$tmp"/*.txt | grep -E "^BALANCE_RAW" | python3 -c '
import sys
games = length = stomps = 0
stat = {}
for line in sys.stdin:
    p = line.split()
    if p[0] == "BALANCE_RAW_GAMES":
        games += int(p[1]); length += int(p[2]); stomps += int(p[3])
    else:
        e = stat.setdefault(p[1], [0, 0, 0, 0, 0])
        for k in range(5):
            e[k] += int(p[2 + k])
print("BALANCE %d판, 평균 길이 %.0f초, 일방적인 경기(진 팀 3킬 이하) %d판" % (games, length / max(1, games), stomps))
for id, e in sorted(stat.items(), key=lambda kv: -kv[1][1] / kv[1][0]):
    print("BALANCE %-14s 승률 %3d%% (%d판)  킬 %.1f  데스 %.1f  영웅 피해 %d" % (id, round(100 * e[1] / e[0]), e[0], e[2] / e[0], e[3] / e[0], e[4] / e[0]))
'
echo "BALANCE 스크립트 오류 ${errors}개"
if [ "$errors" != "0" ]; then
	cat "$tmp"/*.txt | grep -E "SCRIPT ERROR|^ERROR:" -A3 | head -20
fi
rm -rf "$tmp"
