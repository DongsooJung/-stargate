#!/usr/bin/env python3
"""
NotebookLM-Style Tool (Powered by Gemini API Free Tier)
=======================================================
Google Gemini API를 활용하여 NotebookLM과 유사한 기능을 제공하는 CLI 프로그램.

기능:
  - 파일 업로드 (PDF, TXT, 이미지 등) → Gemini File API
  - 문서 기반 Q&A 채팅 (NotebookLM 채팅과 동일)
  - 문서 요약 생성
  - 팟캐스트 스크립트 생성 (NotebookLM 오디오 오버뷰 스타일)
  - 업로드된 파일 관리

무료 티어 (gemini-2.0-flash):
  - 15 RPM / 1,500 RPD / 1M TPM
  - 파일 업로드 무료

사전 준비:
  1. API 키 발급: https://aistudio.google.com/apikey
  2. pip install -r requirements.txt
  3. .env 파일에 GOOGLE_API_KEY 설정

사용법:
  python notebooklm_api.py upload --file document.pdf
  python notebooklm_api.py upload --file paper.txt --file image.png
  python notebooklm_api.py list-files
  python notebooklm_api.py delete-file --name files/abc123
  python notebooklm_api.py summarize --file-name files/abc123
  python notebooklm_api.py summarize --text "내용..."
  python notebooklm_api.py chat --file-name files/abc123 --question "핵심 내용은?"
  python notebooklm_api.py podcast --file-name files/abc123 --topic "AI 트렌드"
  python notebooklm_api.py podcast --text "내용..." --topic "주제"
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")


def get_client():
    """Gemini API 클라이언트 생성."""
    if not GOOGLE_API_KEY:
        print("오류: GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.")
        print("API 키 발급: https://aistudio.google.com/apikey")
        print("설정 방법: export GOOGLE_API_KEY='your_key'")
        print("또는 .env 파일 생성 (.env.example 참고)")
        sys.exit(1)
    return genai.Client(api_key=GOOGLE_API_KEY)


# ---------------------------------------------------------------------------
# 파일 업로드 / 관리 (Gemini File API)
# ---------------------------------------------------------------------------

def upload_files(file_paths):
    """파일을 Gemini File API에 업로드."""
    client = get_client()
    uploaded = []

    for fp in file_paths:
        path = Path(fp)
        if not path.exists():
            print(f"오류: 파일을 찾을 수 없습니다: {fp}")
            continue

        print(f"업로드 중: {path.name}...")
        uploaded_file = client.files.upload(file=path)
        print(f"  완료!")
        print(f"  파일명:    {uploaded_file.name}")
        print(f"  표시명:    {uploaded_file.display_name}")
        print(f"  MIME:      {uploaded_file.mime_type}")
        print(f"  크기:      {uploaded_file.size_bytes:,} bytes")
        print(f"  상태:      {uploaded_file.state}")
        print(f"  URI:       {uploaded_file.uri}")
        print()
        uploaded.append(uploaded_file)

    if uploaded:
        print(f"총 {len(uploaded)}개 파일 업로드 완료.")
    return uploaded


def list_files():
    """업로드된 파일 목록 조회."""
    client = get_client()
    files = list(client.files.list())

    if not files:
        print("업로드된 파일이 없습니다.")
        return []

    print(f"총 {len(files)}개 파일:\n")
    for f in files:
        print(f"  이름:   {f.name}")
        print(f"  표시명: {f.display_name}")
        print(f"  MIME:   {f.mime_type}")
        print(f"  크기:   {f.size_bytes:,} bytes")
        print(f"  상태:   {f.state}")
        print()
    return files


def delete_file(file_name):
    """업로드된 파일 삭제."""
    client = get_client()
    client.files.delete(name=file_name)
    print(f"파일 '{file_name}' 삭제 완료.")


def get_file(file_name):
    """파일 정보 조회."""
    client = get_client()
    f = client.files.get(name=file_name)
    print(f"  이름:   {f.name}")
    print(f"  표시명: {f.display_name}")
    print(f"  MIME:   {f.mime_type}")
    print(f"  크기:   {f.size_bytes:,} bytes")
    print(f"  상태:   {f.state}")
    print(f"  URI:    {f.uri}")
    return f


# ---------------------------------------------------------------------------
# 문서 요약
# ---------------------------------------------------------------------------

def summarize(file_names=None, text=None, language="ko"):
    """문서 요약 생성 (NotebookLM 요약 기능과 유사)."""
    client = get_client()
    contents = []

    if file_names:
        for name in file_names:
            f = client.files.get(name=name)
            contents.append(types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type))

    prompt = f"""당신은 전문 문서 분석가입니다. 다음 내용을 분석하고 구조화된 요약을 작성해주세요.

요약 형식:
1. **핵심 요약** (3-5문장)
2. **주요 포인트** (불릿 포인트)
3. **핵심 키워드** (5-10개)
4. **추가 탐구 질문** (3개)

언어: {'한국어' if language == 'ko' else language}로 작성해주세요.
"""

    if text:
        prompt += f"\n\n분석할 내용:\n{text}"

    contents.append(types.Part.from_text(text=prompt))

    print("요약 생성 중...\n")
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
    )
    print(response.text)
    return response.text


# ---------------------------------------------------------------------------
# 문서 기반 Q&A 채팅
# ---------------------------------------------------------------------------

def chat_with_docs(file_names=None, text=None, question="", language="ko"):
    """문서 기반 Q&A (NotebookLM 채팅 기능과 유사)."""
    client = get_client()
    contents = []

    if file_names:
        for name in file_names:
            f = client.files.get(name=name)
            contents.append(types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type))

    prompt = f"""당신은 주어진 문서를 기반으로 질문에 답변하는 AI 어시스턴트입니다.
문서에 포함된 정보만을 사용하여 정확하게 답변해주세요.
문서에 없는 내용이라면 "문서에서 해당 정보를 찾을 수 없습니다"라고 답해주세요.

언어: {'한국어' if language == 'ko' else language}로 답변해주세요.
"""

    if text:
        prompt += f"\n\n참고 자료:\n{text}"

    prompt += f"\n\n질문: {question}"
    contents.append(types.Part.from_text(text=prompt))

    print("답변 생성 중...\n")
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
    )
    print(response.text)
    return response.text


def interactive_chat(file_names=None, text=None, language="ko"):
    """대화형 Q&A 세션 (NotebookLM 채팅과 동일한 경험)."""
    client = get_client()

    # 시스템 프롬프트와 문서를 포함한 초기 컨텍스트 구성
    system_instruction = f"""당신은 주어진 문서를 기반으로 질문에 답변하는 AI 어시스턴트입니다.
문서에 포함된 정보만을 사용하여 정확하게 답변해주세요.
문서에 없는 내용이라면 "문서에서 해당 정보를 찾을 수 없습니다"라고 답해주세요.
언어: {'한국어' if language == 'ko' else language}로 답변해주세요."""

    initial_parts = []
    if file_names:
        for name in file_names:
            f = client.files.get(name=name)
            initial_parts.append(types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type))
    if text:
        initial_parts.append(types.Part.from_text(text=f"참고 자료:\n{text}"))

    chat = client.chats.create(
        model=GEMINI_MODEL,
        config=types.GenerateContentConfig(system_instruction=system_instruction),
        history=[
            types.Content(role="user", parts=initial_parts),
            types.Content(role="model", parts=[
                types.Part.from_text(text="문서를 확인했습니다. 질문해주세요!")
            ]),
        ] if initial_parts else [],
    )

    print("=" * 60)
    print(" NotebookLM 스타일 대화형 Q&A")
    print(" 종료: 'quit' 또는 'exit' 입력")
    print("=" * 60)
    print()

    if initial_parts:
        print("문서가 로드되었습니다. 질문해주세요!\n")

    while True:
        try:
            question = input("질문> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n세션 종료.")
            break

        if not question:
            continue
        if question.lower() in ("quit", "exit", "종료"):
            print("세션 종료.")
            break

        response = chat.send_message(question)
        print(f"\n{response.text}\n")


# ---------------------------------------------------------------------------
# 팟캐스트 스크립트 생성 (NotebookLM 오디오 오버뷰 스타일)
# ---------------------------------------------------------------------------

def generate_podcast_script(file_names=None, text=None, topic=None,
                            language="ko", hosts=2):
    """팟캐스트 대본 생성 (NotebookLM 오디오 오버뷰와 유사).

    2명의 진행자가 대화하는 형식의 팟캐스트 스크립트를 생성합니다.
    """
    client = get_client()
    contents = []

    if file_names:
        for name in file_names:
            f = client.files.get(name=name)
            contents.append(types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type))

    host_names = ["호스트A", "호스트B"] if language == "ko" else ["Host A", "Host B"]
    if hosts > 2:
        for i in range(2, hosts):
            suffix = chr(ord("C") + i - 2)
            host_names.append(f"호스트{suffix}" if language == "ko" else f"Host {suffix}")

    prompt = f"""당신은 전문 팟캐스트 작가입니다. 주어진 자료를 바탕으로
{hosts}명의 진행자({', '.join(host_names)})가 대화하는 팟캐스트 대본을 작성해주세요.

형식:
- 자연스러운 대화체 사용
- 각 발화는 "[진행자명]: 대사" 형식
- 인트로 → 핵심 내용 논의 → 심화 토론 → 마무리 구조
- 청취자가 이해하기 쉽게 비유와 예시 활용
- 대본 길이: 약 2000-3000자

언어: {'한국어' if language == 'ko' else language}
"""

    if topic:
        prompt += f"\n주제/포커스: {topic}"

    if text:
        prompt += f"\n\n분석할 자료:\n{text}"

    contents.append(types.Part.from_text(text=prompt))

    print("팟캐스트 스크립트 생성 중...\n")
    print("=" * 60)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
    )
    print(response.text)
    print("=" * 60)
    return response.text


# ---------------------------------------------------------------------------
# 학습 가이드 생성
# ---------------------------------------------------------------------------

def generate_study_guide(file_names=None, text=None, language="ko"):
    """학습 가이드 생성 (NotebookLM 학습 가이드 기능)."""
    client = get_client()
    contents = []

    if file_names:
        for name in file_names:
            f = client.files.get(name=name)
            contents.append(types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type))

    prompt = f"""당신은 교육 전문가입니다. 주어진 자료를 바탕으로 종합 학습 가이드를 작성해주세요.

학습 가이드 형식:
1. **학습 목표** - 이 자료에서 배울 수 있는 핵심 내용
2. **개념 정리** - 주요 개념을 표 형식으로 정리
3. **핵심 요약** - 챕터/섹션별 요약
4. **이해도 점검 퀴즈** - 객관식 5문제 + 서술형 3문제
5. **심화 학습 키워드** - 추가로 공부할 주제

언어: {'한국어' if language == 'ko' else language}로 작성해주세요.
"""

    if text:
        prompt += f"\n\n학습 자료:\n{text}"

    contents.append(types.Part.from_text(text=prompt))

    print("학습 가이드 생성 중...\n")
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
    )
    print(response.text)
    return response.text


# ---------------------------------------------------------------------------
# FAQ 생성
# ---------------------------------------------------------------------------

def generate_faq(file_names=None, text=None, count=10, language="ko"):
    """자주 묻는 질문(FAQ) 자동 생성."""
    client = get_client()
    contents = []

    if file_names:
        for name in file_names:
            f = client.files.get(name=name)
            contents.append(types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type))

    prompt = f"""주어진 자료를 분석하여 자주 묻는 질문(FAQ) {count}개를 생성해주세요.

형식:
**Q1: [질문]**
A1: [상세한 답변]

...

질문은 실제 독자/사용자가 궁금해할 만한 실용적인 내용으로 작성해주세요.
언어: {'한국어' if language == 'ko' else language}로 작성해주세요.
"""

    if text:
        prompt += f"\n\n자료:\n{text}"

    contents.append(types.Part.from_text(text=prompt))

    print("FAQ 생성 중...\n")
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
    )
    print(response.text)
    return response.text


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="NotebookLM 스타일 도구 (Gemini API 무료 티어)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  # 파일 업로드
  %(prog)s upload --file document.pdf
  %(prog)s upload --file paper.txt --file image.png

  # 파일 관리
  %(prog)s list-files
  %(prog)s get-file --name files/abc123
  %(prog)s delete-file --name files/abc123

  # 문서 요약
  %(prog)s summarize --file-name files/abc123
  %(prog)s summarize --text "요약할 내용..."

  # 문서 Q&A
  %(prog)s chat --file-name files/abc123 --question "핵심은?"
  %(prog)s interactive --file-name files/abc123

  # 팟캐스트 스크립트 생성 (오디오 오버뷰)
  %(prog)s podcast --file-name files/abc123 --topic "AI 트렌드"

  # 학습 가이드 생성
  %(prog)s study-guide --file-name files/abc123

  # FAQ 생성
  %(prog)s faq --file-name files/abc123 --count 10
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # upload
    p_upload = subparsers.add_parser("upload", help="파일 업로드")
    p_upload.add_argument("--file", action="append", required=True,
                          help="업로드할 파일 경로 (여러 개 가능)")

    # list-files
    subparsers.add_parser("list-files", help="업로드된 파일 목록")

    # get-file
    p_get = subparsers.add_parser("get-file", help="파일 정보 조회")
    p_get.add_argument("--name", required=True, help="파일명 (예: files/abc123)")

    # delete-file
    p_del = subparsers.add_parser("delete-file", help="파일 삭제")
    p_del.add_argument("--name", required=True, help="파일명 (예: files/abc123)")

    # summarize
    p_sum = subparsers.add_parser("summarize", help="문서 요약")
    p_sum.add_argument("--file-name", action="append", help="파일명 (여러 개 가능)")
    p_sum.add_argument("--text", help="직접 입력할 텍스트")
    p_sum.add_argument("--language", default="ko", help="출력 언어 (기본: ko)")

    # chat (단일 질문)
    p_chat = subparsers.add_parser("chat", help="문서 Q&A (단일 질문)")
    p_chat.add_argument("--file-name", action="append", help="파일명")
    p_chat.add_argument("--text", help="참고 텍스트")
    p_chat.add_argument("--question", "-q", required=True, help="질문")
    p_chat.add_argument("--language", default="ko", help="출력 언어 (기본: ko)")

    # interactive (대화형)
    p_inter = subparsers.add_parser("interactive", help="대화형 Q&A 세션")
    p_inter.add_argument("--file-name", action="append", help="파일명")
    p_inter.add_argument("--text", help="참고 텍스트")
    p_inter.add_argument("--language", default="ko", help="출력 언어 (기본: ko)")

    # podcast
    p_pod = subparsers.add_parser("podcast", help="팟캐스트 스크립트 생성")
    p_pod.add_argument("--file-name", action="append", help="파일명")
    p_pod.add_argument("--text", help="참고 텍스트")
    p_pod.add_argument("--topic", help="팟캐스트 주제/포커스")
    p_pod.add_argument("--hosts", type=int, default=2, help="진행자 수 (기본: 2)")
    p_pod.add_argument("--language", default="ko", help="출력 언어 (기본: ko)")

    # study-guide
    p_study = subparsers.add_parser("study-guide", help="학습 가이드 생성")
    p_study.add_argument("--file-name", action="append", help="파일명")
    p_study.add_argument("--text", help="학습 자료 텍스트")
    p_study.add_argument("--language", default="ko", help="출력 언어 (기본: ko)")

    # faq
    p_faq = subparsers.add_parser("faq", help="FAQ 자동 생성")
    p_faq.add_argument("--file-name", action="append", help="파일명")
    p_faq.add_argument("--text", help="참고 텍스트")
    p_faq.add_argument("--count", type=int, default=10, help="생성할 FAQ 수 (기본: 10)")
    p_faq.add_argument("--language", default="ko", help="출력 언어 (기본: ko)")

    args = parser.parse_args()

    if args.command == "upload":
        upload_files(args.file)
    elif args.command == "list-files":
        list_files()
    elif args.command == "get-file":
        get_file(args.name)
    elif args.command == "delete-file":
        delete_file(args.name)
    elif args.command == "summarize":
        summarize(file_names=args.file_name, text=args.text, language=args.language)
    elif args.command == "chat":
        chat_with_docs(file_names=args.file_name, text=args.text,
                       question=args.question, language=args.language)
    elif args.command == "interactive":
        interactive_chat(file_names=args.file_name, text=args.text,
                         language=args.language)
    elif args.command == "podcast":
        generate_podcast_script(file_names=args.file_name, text=args.text,
                                topic=args.topic, language=args.language,
                                hosts=args.hosts)
    elif args.command == "study-guide":
        generate_study_guide(file_names=args.file_name, text=args.text,
                             language=args.language)
    elif args.command == "faq":
        generate_faq(file_names=args.file_name, text=args.text,
                     count=args.count, language=args.language)


if __name__ == "__main__":
    main()
