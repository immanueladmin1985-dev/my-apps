#!/usr/bin/env bash
# 자동 시험 실행. GODOT 환경 변수에 Godot 실행 파일 경로를 넣는다.
# 사용: GODOT=/경로/godot tools/run_tests.sh [--only=이름] [--fast]
set -u
GODOT=${GODOT:-godot}
cd "$(dirname "$0")/.."
"$GODOT" --headless --path . --import >/dev/null 2>&1
out=$("$GODOT" --headless --path . --fixed-fps 60 res://tests/test_runner.tscn -- "$@" 2>&1)
code=$?
echo "$out" | grep -vE "^Godot Engine|^\s*$"
if echo "$out" | grep -qE "SCRIPT ERROR|^ERROR:"; then
	echo "스크립트 오류가 있어 실패로 처리합니다."
	exit 1
fi
exit $code
