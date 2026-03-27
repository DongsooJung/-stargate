#!/usr/bin/env python3
"""
NotebookLM Enterprise API Client
=================================
A Python CLI to interact with Google Cloud's NotebookLM Enterprise API
(Discovery Engine v1alpha).

Supports:
- Creating and managing notebooks
- Adding sources (text, URL, YouTube, Google Drive, file upload)
- Generating audio overviews (podcast-style summaries)
- Generating standalone podcasts (Podcast API v1)

Prerequisites:
    1. A Google Cloud project with Discovery Engine API enabled
    2. gcloud CLI installed and authenticated:
       $ gcloud auth application-default login
    3. IAM roles assigned (Cloud NotebookLM Admin or User)

Usage:
    python notebooklm_api.py create-notebook --title "My Notebook"
    python notebooklm_api.py list-notebooks
    python notebooklm_api.py add-source --notebook <ID> --text "Content here"
    python notebooklm_api.py add-source --notebook <ID> --url "https://example.com"
    python notebooklm_api.py add-source --notebook <ID> --youtube "https://youtube.com/watch?v=..."
    python notebooklm_api.py add-source --notebook <ID> --drive-doc-id "DOC_ID"
    python notebooklm_api.py upload-file --notebook <ID> --file document.pdf
    python notebooklm_api.py list-sources --notebook <ID>
    python notebooklm_api.py generate-audio --notebook <ID>
    python notebooklm_api.py generate-podcast --text "Content" --title "My Podcast"
    python notebooklm_api.py delete-notebook --notebook <ID>
    python notebooklm_api.py delete-source --notebook <ID> --source <SOURCE_ID>
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

import google.auth
import google.auth.transport.requests
import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GCP_PROJECT_NUMBER = os.environ.get("GCP_PROJECT_NUMBER", "")
GCP_LOCATION = os.environ.get("GCP_LOCATION", "global")
GCP_ENDPOINT_LOCATION = os.environ.get("GCP_ENDPOINT_LOCATION", "us")


def _base_url():
    return (
        f"https://{GCP_ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1alpha"
        f"/projects/{GCP_PROJECT_NUMBER}/locations/{GCP_LOCATION}"
    )


def _get_access_token():
    """Get an OAuth 2.0 access token via Application Default Credentials."""
    credentials, _ = google.auth.default()
    credentials.refresh(google.auth.transport.requests.Request())
    return credentials.token


def _headers():
    return {
        "Authorization": f"Bearer {_get_access_token()}",
        "Content-Type": "application/json",
    }


def _check_config():
    if not GCP_PROJECT_NUMBER:
        print("Error: GCP_PROJECT_NUMBER environment variable is not set.")
        print("Set it via: export GCP_PROJECT_NUMBER='your_project_number'")
        print("Or create a .env file (see .env.example)")
        sys.exit(1)


def _handle_response(resp, success_msg=None):
    """Handle API response: print result or error."""
    if resp.ok:
        data = resp.json() if resp.text else {}
        if success_msg:
            print(success_msg)
        return data
    else:
        print(f"Error ({resp.status_code}): {resp.text}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Notebook operations
# ---------------------------------------------------------------------------

def create_notebook(title="Untitled Notebook"):
    """Create a new NotebookLM notebook."""
    _check_config()
    url = f"{_base_url()}/notebooks"
    payload = {"title": title}
    resp = requests.post(url, headers=_headers(), json=payload)
    data = _handle_response(resp, "Notebook created successfully!")
    print(f"  ID:    {data.get('name', 'N/A')}")
    print(f"  NB ID: {data.get('notebookId', 'N/A')}")
    return data


def list_notebooks():
    """List recently viewed notebooks (up to 500)."""
    _check_config()
    url = f"{_base_url()}/notebooks:listRecentlyViewed"
    resp = requests.get(url, headers=_headers())
    data = _handle_response(resp)

    notebooks = data.get("notebooks", [])
    if not notebooks:
        print("No notebooks found.")
        return []

    print(f"Found {len(notebooks)} notebook(s):\n")
    for nb in notebooks:
        print(f"  Name:  {nb.get('name', 'N/A')}")
        print(f"  Title: {nb.get('title', 'N/A')}")
        print(f"  ID:    {nb.get('notebookId', 'N/A')}")
        print()
    return notebooks


def delete_notebook(notebook_id):
    """Delete notebooks by ID (batch delete)."""
    _check_config()
    url = f"{_base_url()}/notebooks:batchDelete"
    payload = {"names": [f"{_base_url()}/notebooks/{notebook_id}"]}
    resp = requests.post(url, headers=_headers(), json=payload)
    _handle_response(resp, f"Notebook '{notebook_id}' deleted successfully.")


def share_notebook(notebook_id, email, role="USER_ROLE"):
    """Share a notebook with a user."""
    _check_config()
    url = f"{_base_url()}/notebooks/{notebook_id}:share"
    payload = {
        "accountAndRoles": [
            {"email": email, "role": role}
        ]
    }
    resp = requests.post(url, headers=_headers(), json=payload)
    _handle_response(resp, f"Notebook shared with {email} (role: {role}).")


# ---------------------------------------------------------------------------
# Source operations
# ---------------------------------------------------------------------------

def _add_sources_batch(notebook_id, user_contents):
    """Add sources to a notebook via batchCreate."""
    _check_config()
    url = f"{_base_url()}/notebooks/{notebook_id}/sources:batchCreate"
    payload = {"userContents": user_contents}
    resp = requests.post(url, headers=_headers(), json=payload)
    return _handle_response(resp, "Source(s) added successfully!")


def add_text_source(notebook_id, text):
    """Add plain text content as a source."""
    return _add_sources_batch(notebook_id, [{"textContent": text}])


def add_url_source(notebook_id, url):
    """Add a web URL as a source."""
    return _add_sources_batch(notebook_id, [{"webSource": {"url": url}}])


def add_youtube_source(notebook_id, youtube_url):
    """Add a YouTube video URL as a source."""
    return _add_sources_batch(notebook_id, [{"youtubeSource": {"url": youtube_url}}])


def add_drive_source(notebook_id, document_id, mime_type="application/vnd.google-apps.document"):
    """Add a Google Drive document as a source."""
    return _add_sources_batch(notebook_id, [{
        "googleDriveSource": {
            "documentId": document_id,
            "mimeType": mime_type,
        }
    }])


def upload_file_source(notebook_id, file_path):
    """Upload a file (PDF, DOCX, TXT, etc.) as a source."""
    _check_config()
    filepath = Path(file_path)
    if not filepath.exists():
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    mime_types = {
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".html": "text/html",
        ".csv": "text/csv",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    mime_type = mime_types.get(filepath.suffix.lower(), "application/octet-stream")

    url = (
        f"https://{GCP_ENDPOINT_LOCATION}-discoveryengine.googleapis.com"
        f"/upload/v1alpha/projects/{GCP_PROJECT_NUMBER}/locations/{GCP_LOCATION}"
        f"/notebooks/{notebook_id}/sources:uploadFile"
    )

    with open(filepath, "rb") as f:
        file_data = f.read()

    headers = {
        "Authorization": f"Bearer {_get_access_token()}",
        "Content-Type": mime_type,
        "X-Goog-Upload-File-Name": filepath.name,
        "X-Goog-Upload-Protocol": "raw",
    }
    resp = requests.post(url, headers=headers, data=file_data)
    data = _handle_response(resp, f"File '{filepath.name}' uploaded successfully!")
    if data:
        print(f"  Source: {json.dumps(data, indent=2)}")
    return data


def list_sources(notebook_id):
    """List all sources in a notebook."""
    _check_config()
    url = f"{_base_url()}/notebooks/{notebook_id}/sources"
    resp = requests.get(url, headers=_headers())
    data = _handle_response(resp)

    sources = data.get("sources", [])
    if not sources:
        print(f"No sources found in notebook '{notebook_id}'.")
        return []

    print(f"Found {len(sources)} source(s):\n")
    for src in sources:
        print(f"  ID:     {src.get('sourceId', 'N/A')}")
        print(f"  Name:   {src.get('name', 'N/A')}")
        print(f"  Title:  {src.get('title', 'N/A')}")
        meta = src.get("metadata", {})
        if meta:
            print(f"  Words:  {meta.get('wordCount', 'N/A')}")
            print(f"  Tokens: {meta.get('tokenCount', 'N/A')}")
        status = src.get("settings", {}).get("status", "N/A")
        print(f"  Status: {status}")
        print()
    return sources


def delete_source(notebook_id, source_ids):
    """Delete sources from a notebook (batch delete)."""
    _check_config()
    url = f"{_base_url()}/notebooks/{notebook_id}/sources:batchDelete"
    if isinstance(source_ids, str):
        source_ids = [source_ids]
    payload = {"names": source_ids}
    resp = requests.post(url, headers=_headers(), json=payload)
    _handle_response(resp, "Source(s) deleted successfully.")


# ---------------------------------------------------------------------------
# Audio overview
# ---------------------------------------------------------------------------

def generate_audio_overview(notebook_id, source_ids=None, focus=None, language="en"):
    """Generate an audio overview (podcast-style) for a notebook.

    Only one audio overview per notebook. Delete the existing one first
    if you want to regenerate.
    """
    _check_config()
    url = f"{_base_url()}/notebooks/{notebook_id}/audioOverviews"
    payload = {}
    if source_ids:
        payload["sourceIds"] = source_ids
    if focus:
        payload["episodeFocus"] = focus
    if language:
        payload["languageCode"] = language

    print("Generating audio overview... (this may take several minutes)")
    resp = requests.post(url, headers=_headers(), json=payload)
    data = _handle_response(resp, "Audio overview generation initiated!")
    print(f"  Response: {json.dumps(data, indent=2)}")
    return data


def delete_audio_overview(notebook_id):
    """Delete the audio overview from a notebook."""
    _check_config()
    url = f"{_base_url()}/notebooks/{notebook_id}/audioOverviews/default"
    resp = requests.delete(url, headers=_headers())
    _handle_response(resp, "Audio overview deleted successfully.")


# ---------------------------------------------------------------------------
# Standalone Podcast API (v1 GA, allowlist required)
# ---------------------------------------------------------------------------

def generate_podcast(title, text=None, file_path=None, focus=None,
                     length="MEDIUM", language="en"):
    """Generate a standalone podcast (no notebook required).

    Requires the Podcast API User IAM role.
    Uses the v1 GA endpoint.
    """
    _check_config()
    url = (
        f"https://discoveryengine.googleapis.com/v1"
        f"/projects/{GCP_PROJECT_NUMBER}/locations/global/podcasts"
    )

    contexts = []
    if text:
        contexts.append({"text": text})
    if file_path:
        fp = Path(file_path)
        if not fp.exists():
            print(f"Error: File not found: {file_path}")
            sys.exit(1)
        mime_types = {
            ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".pdf": "application/pdf", ".txt": "text/plain",
        }
        mime_type = mime_types.get(fp.suffix.lower(), "application/octet-stream")
        with open(fp, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        contexts.append({"blob": {"mimeType": mime_type, "data": encoded}})

    if not contexts:
        print("Error: Provide --text and/or --file for podcast content.")
        sys.exit(1)

    payload = {
        "title": title,
        "podcastConfig": {
            "focus": focus or "",
            "length": length,
            "languageCode": language,
        },
        "contexts": contexts,
    }

    print("Generating podcast... (this may take several minutes)")
    resp = requests.post(url, headers=_headers(), json=payload)
    data = _handle_response(resp, "Podcast generation initiated!")
    print(f"  Response: {json.dumps(data, indent=2)}")
    return data


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="NotebookLM Enterprise API Client",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s create-notebook --title "Research Notes"
  %(prog)s list-notebooks
  %(prog)s add-source --notebook NB_ID --text "Some content to analyze"
  %(prog)s add-source --notebook NB_ID --url "https://example.com/article"
  %(prog)s add-source --notebook NB_ID --youtube "https://youtube.com/watch?v=abc"
  %(prog)s add-source --notebook NB_ID --drive-doc-id "GOOGLE_DOC_ID"
  %(prog)s upload-file --notebook NB_ID --file paper.pdf
  %(prog)s list-sources --notebook NB_ID
  %(prog)s generate-audio --notebook NB_ID --focus "Key findings"
  %(prog)s delete-audio --notebook NB_ID
  %(prog)s generate-podcast --title "My Podcast" --text "Content here"
  %(prog)s delete-notebook --notebook NB_ID
  %(prog)s delete-source --notebook NB_ID --source SRC_ID
  %(prog)s share-notebook --notebook NB_ID --email user@example.com
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-notebook
    p_create = subparsers.add_parser("create-notebook", help="Create a new notebook")
    p_create.add_argument("--title", default="Untitled Notebook", help="Notebook title")

    # list-notebooks
    subparsers.add_parser("list-notebooks", help="List recently viewed notebooks")

    # delete-notebook
    p_del_nb = subparsers.add_parser("delete-notebook", help="Delete a notebook")
    p_del_nb.add_argument("--notebook", required=True, help="Notebook ID")

    # share-notebook
    p_share = subparsers.add_parser("share-notebook", help="Share a notebook")
    p_share.add_argument("--notebook", required=True, help="Notebook ID")
    p_share.add_argument("--email", required=True, help="User email to share with")
    p_share.add_argument("--role", default="USER_ROLE", help="Role (default: USER_ROLE)")

    # add-source
    p_add = subparsers.add_parser("add-source", help="Add a source to a notebook")
    p_add.add_argument("--notebook", required=True, help="Notebook ID")
    source_group = p_add.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--text", help="Plain text content")
    source_group.add_argument("--url", help="Web URL")
    source_group.add_argument("--youtube", help="YouTube video URL")
    source_group.add_argument("--drive-doc-id", help="Google Drive document ID")

    # upload-file
    p_upload = subparsers.add_parser("upload-file", help="Upload a file as source")
    p_upload.add_argument("--notebook", required=True, help="Notebook ID")
    p_upload.add_argument("--file", required=True, help="File path to upload")

    # list-sources
    p_list_src = subparsers.add_parser("list-sources", help="List sources in a notebook")
    p_list_src.add_argument("--notebook", required=True, help="Notebook ID")

    # delete-source
    p_del_src = subparsers.add_parser("delete-source", help="Delete a source")
    p_del_src.add_argument("--notebook", required=True, help="Notebook ID")
    p_del_src.add_argument("--source", required=True, help="Source ID")

    # generate-audio
    p_audio = subparsers.add_parser("generate-audio", help="Generate audio overview")
    p_audio.add_argument("--notebook", required=True, help="Notebook ID")
    p_audio.add_argument("--source-ids", nargs="*", help="Specific source IDs (optional)")
    p_audio.add_argument("--focus", help="Episode focus description")
    p_audio.add_argument("--language", default="en", help="Language code (default: en)")

    # delete-audio
    p_del_audio = subparsers.add_parser("delete-audio", help="Delete audio overview")
    p_del_audio.add_argument("--notebook", required=True, help="Notebook ID")

    # generate-podcast (standalone)
    p_podcast = subparsers.add_parser("generate-podcast", help="Generate standalone podcast")
    p_podcast.add_argument("--title", required=True, help="Podcast title")
    p_podcast.add_argument("--text", help="Text content for the podcast")
    p_podcast.add_argument("--file", help="File to include (image, PDF, etc.)")
    p_podcast.add_argument("--focus", help="Focus topic")
    p_podcast.add_argument("--length", default="MEDIUM", choices=["SHORT", "MEDIUM", "LONG"],
                           help="Podcast length")
    p_podcast.add_argument("--language", default="en", help="Language code (default: en)")

    args = parser.parse_args()

    if args.command == "create-notebook":
        create_notebook(title=args.title)
    elif args.command == "list-notebooks":
        list_notebooks()
    elif args.command == "delete-notebook":
        delete_notebook(args.notebook)
    elif args.command == "share-notebook":
        share_notebook(args.notebook, args.email, args.role)
    elif args.command == "add-source":
        if args.text:
            add_text_source(args.notebook, args.text)
        elif args.url:
            add_url_source(args.notebook, args.url)
        elif args.youtube:
            add_youtube_source(args.notebook, args.youtube)
        elif args.drive_doc_id:
            add_drive_source(args.notebook, args.drive_doc_id)
    elif args.command == "upload-file":
        upload_file_source(args.notebook, args.file)
    elif args.command == "list-sources":
        list_sources(args.notebook)
    elif args.command == "delete-source":
        delete_source(args.notebook, args.source)
    elif args.command == "generate-audio":
        generate_audio_overview(args.notebook, source_ids=args.source_ids,
                                focus=args.focus, language=args.language)
    elif args.command == "delete-audio":
        delete_audio_overview(args.notebook)
    elif args.command == "generate-podcast":
        generate_podcast(title=args.title, text=args.text, file_path=args.file,
                         focus=args.focus, length=args.length, language=args.language)


if __name__ == "__main__":
    main()
