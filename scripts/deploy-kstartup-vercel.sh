#!/usr/bin/env bash
# Vercel에 K-Startup API를 배포합니다.
# 필요: VERCEL_TOKEN (https://vercel.com/account/tokens)
# 선택: VERCEL_ORG_ID, VERCEL_PROJECT_ID (기존 stargate-bid-api에 붙일 때)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN 환경변수가 필요합니다."
  echo "  export VERCEL_TOKEN=... "
  echo "또는: npx vercel login 후 이 스크립트를 다시 실행하세요."
  exit 1
fi

npx --yes vercel@58 --version >/dev/null

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

mkdir -p "$WORKDIR/api"
cp "$ROOT/api/kstartup.js" "$WORKDIR/api/"
# 기존 bid/lh 프록시도 함께 있으면 stargate-bid-api에 덮어쓰지 않도록
# kstartup만 단독 프로젝트로 배포 (기본)
cat > "$WORKDIR/vercel.json" <<'JSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["icn1"]
}
JSON
cat > "$WORKDIR/package.json" <<'JSON'
{
  "name": "stargate-kstartup-api",
  "private": true
}
JSON

cd "$WORKDIR"
ARGS=(deploy --prod --yes --token "$VERCEL_TOKEN" --name stargate-kstartup-api)
if [[ -n "${VERCEL_ORG_ID:-}" ]]; then
  export VERCEL_ORG_ID
fi
if [[ -n "${VERCEL_PROJECT_ID:-}" ]]; then
  export VERCEL_PROJECT_ID
fi

# 공개데이터 키를 서버 env로 주입 (이미 프로젝트에 있으면 유지)
if [[ -n "${DATA_GO_KR_API_KEY:-}" ]]; then
  ARGS+=(--env "DATA_GO_KR_API_KEY=$DATA_GO_KR_API_KEY")
fi

echo "Deploying stargate-kstartup-api ..."
npx --yes vercel@58 "${ARGS[@]}"
