#!/usr/bin/env bash
# 빌드 검사(PRD §6-5): dist 에 HTML 1개, 8MB(8388608 B) 미만, 외부 URL 0건.
# Preact 런타임의 XML 네임스페이스 상수(www.w3.org)는 네트워크 요청이 아니라 제외한다.
cd "$(dirname "$0")/.." || exit 1
fail=0

n=$(ls dist/*.html 2>/dev/null | wc -l | tr -d ' ')
if [ "$n" -ne 1 ]; then echo "FAIL html 개수: $n (1 이어야 함)"; fail=1; else echo "OK   html 개수: 1"; fi

f=dist/index.html
if [ ! -f "$f" ]; then echo "FAIL $f 없음"; exit 1; fi

size=$(stat -f%z "$f")
if [ "$size" -ge 8388608 ]; then echo "FAIL 크기: $size B (8388608 B 미만이어야 함)"; fail=1; else echo "OK   크기: $size B"; fi

urls=$(grep -o 'https\?://[^"'"'"' )>]*' "$f" | grep -v 'www.w3.org' | sort -u)
if [ -n "$urls" ]; then echo "FAIL 외부 URL:"; echo "$urls" | sed 's/^/     /'; fail=1; else echo "OK   외부 URL: 0"; fi

exit $fail
