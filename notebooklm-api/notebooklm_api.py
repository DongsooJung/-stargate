#!/usr/bin/env python3
"""
NotebookLM API Client
=====================
A Python program to interact with Google's NotebookLM API.

Supports:
- Creating notebooks
- Adding sources (text, URLs, files)
- Generating audio overviews (podcast-style summaries)
- Listing and managing notebooks and sources

Usage:
    python notebooklm_api.py create-notebook --title "My Notebook"
    python notebooklm_api.py add-source --notebook <ID> --text "Content here"
    python notebooklm_api.py add-source --notebook <ID> --url "https://example.com"
    python notebooklm_api.py add-source --notebook <ID> --file document.pdf
    python notebooklm_api.py generate-audio --notebook <ID>
    python notebooklm_api.py list-notebooks
    python notebooklm_api.py list-sources --notebook <ID>
    python notebooklm_api.py delete-notebook --notebook <ID>
    python notebooklm_api.py delete-source --notebook <ID> --source <ID>

Requires:
    GOOGLE_API_KEY environment variable (or .env file)
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


def get_client():
    """Create and return a Google GenAI client."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable is not set.")
        print("Get your API key at: https://aistudio.google.com/apikey")
        print("Set it via: export GOOGLE_API_KEY='your_key'")
        print("Or create a .env file with: GOOGLE_API_KEY=your_key")
        sys.exit(1)
    return genai.Client(api_key=api_key)


# ---------------------------------------------------------------------------
# Notebook operations
# ---------------------------------------------------------------------------

def create_notebook(title="Untitled Notebook", description=None):
    """Create a new NotebookLM notebook (corpus)."""
    client = get_client()
    request = {"display_name": title}
    if description:
        request["description"] = description

    corpus = client.corpora.create(**request)
    print(f"Notebook created successfully!")
    print(f"  ID:    {corpus.name}")
    print(f"  Title: {corpus.display_name}")
    return corpus


def list_notebooks():
    """List all NotebookLM notebooks."""
    client = get_client()
    corpora = client.corpora.list()

    notebooks = list(corpora)
    if not notebooks:
        print("No notebooks found.")
        return []

    print(f"Found {len(notebooks)} notebook(s):\n")
    for nb in notebooks:
        print(f"  ID:    {nb.name}")
        print(f"  Title: {nb.display_name}")
        if hasattr(nb, "create_time") and nb.create_time:
            print(f"  Created: {nb.create_time}")
        print()
    return notebooks


def delete_notebook(notebook_id):
    """Delete a NotebookLM notebook."""
    client = get_client()
    client.corpora.delete(name=notebook_id)
    print(f"Notebook '{notebook_id}' deleted successfully.")


# ---------------------------------------------------------------------------
# Source operations
# ---------------------------------------------------------------------------

def add_text_source(notebook_id, text, display_name=None):
    """Add a plain text source to a notebook."""
    client = get_client()
    doc = client.corpora.documents.create(
        parent=notebook_id,
        document={
            "display_name": display_name or "Text Source",
            "raw_document": {
                "content": text,
                "mime_type": "text/plain",
            },
        },
    )
    print(f"Text source added successfully!")
    print(f"  Source ID: {doc.name}")
    print(f"  Name:     {doc.display_name}")
    return doc


def add_url_source(notebook_id, url, display_name=None):
    """Add a URL/web page source to a notebook."""
    client = get_client()
    doc = client.corpora.documents.create(
        parent=notebook_id,
        document={
            "display_name": display_name or url,
            "uri_source": {"uri": url},
        },
    )
    print(f"URL source added successfully!")
    print(f"  Source ID: {doc.name}")
    print(f"  Name:     {doc.display_name}")
    return doc


def add_file_source(notebook_id, file_path, display_name=None):
    """Add a file (PDF, TXT, etc.) as a source to a notebook."""
    client = get_client()
    filepath = Path(file_path)
    if not filepath.exists():
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    mime_types = {
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".html": "text/html",
        ".htm": "text/html",
        ".csv": "text/csv",
        ".json": "application/json",
    }
    mime_type = mime_types.get(filepath.suffix.lower(), "application/octet-stream")

    with open(filepath, "rb") as f:
        content = f.read()

    doc = client.corpora.documents.create(
        parent=notebook_id,
        document={
            "display_name": display_name or filepath.name,
            "raw_document": {
                "content": content,
                "mime_type": mime_type,
            },
        },
    )
    print(f"File source added successfully!")
    print(f"  Source ID: {doc.name}")
    print(f"  Name:     {doc.display_name}")
    return doc


def list_sources(notebook_id):
    """List all sources in a notebook."""
    client = get_client()
    docs = client.corpora.documents.list(parent=notebook_id)

    sources = list(docs)
    if not sources:
        print(f"No sources found in notebook '{notebook_id}'.")
        return []

    print(f"Found {len(sources)} source(s) in notebook:\n")
    for src in sources:
        print(f"  ID:   {src.name}")
        print(f"  Name: {src.display_name}")
        if hasattr(src, "create_time") and src.create_time:
            print(f"  Created: {src.create_time}")
        print()
    return sources


def delete_source(notebook_id, source_id):
    """Delete a source from a notebook."""
    client = get_client()
    client.corpora.documents.delete(name=source_id)
    print(f"Source '{source_id}' deleted successfully.")


# ---------------------------------------------------------------------------
# Audio overview generation
# ---------------------------------------------------------------------------

def generate_audio_overview(notebook_id, output_path=None):
    """Generate an audio overview (podcast-style) from a notebook's sources.

    This uses the NotebookLM audio generation feature to create a
    conversational podcast-style summary of the notebook content.
    """
    client = get_client()

    print("Generating audio overview... (this may take a few minutes)")

    operation = client.corpora.generate_audio_overview(name=notebook_id)

    # Poll for completion
    while not operation.done:
        print("  Still generating...")
        time.sleep(10)
        operation = client.operations.get(name=operation.name)

    if operation.error:
        print(f"Error generating audio: {operation.error.message}")
        sys.exit(1)

    result = operation.result
    print("Audio overview generated successfully!")

    if output_path:
        out = Path(output_path)
    else:
        out = Path(f"audio_overview_{notebook_id.split('/')[-1]}.wav")

    if hasattr(result, "audio") and result.audio:
        with open(out, "wb") as f:
            f.write(result.audio.content)
        print(f"  Saved to: {out}")
    elif hasattr(result, "uri") and result.uri:
        print(f"  Audio URI: {result.uri}")
    else:
        print(f"  Result: {result}")

    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="NotebookLM API Client - Manage notebooks and generate audio overviews",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s create-notebook --title "Research Notes"
  %(prog)s add-source --notebook corpora/abc123 --text "Some content"
  %(prog)s add-source --notebook corpora/abc123 --url "https://example.com/article"
  %(prog)s add-source --notebook corpora/abc123 --file paper.pdf
  %(prog)s generate-audio --notebook corpora/abc123
  %(prog)s list-notebooks
  %(prog)s list-sources --notebook corpora/abc123
  %(prog)s delete-notebook --notebook corpora/abc123
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-notebook
    p_create = subparsers.add_parser("create-notebook", help="Create a new notebook")
    p_create.add_argument("--title", default="Untitled Notebook", help="Notebook title")
    p_create.add_argument("--description", help="Notebook description")

    # list-notebooks
    subparsers.add_parser("list-notebooks", help="List all notebooks")

    # delete-notebook
    p_del_nb = subparsers.add_parser("delete-notebook", help="Delete a notebook")
    p_del_nb.add_argument("--notebook", required=True, help="Notebook ID (e.g., corpora/abc123)")

    # add-source
    p_add = subparsers.add_parser("add-source", help="Add a source to a notebook")
    p_add.add_argument("--notebook", required=True, help="Notebook ID")
    p_add.add_argument("--name", help="Display name for the source")
    source_group = p_add.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--text", help="Plain text content to add")
    source_group.add_argument("--url", help="URL to add as source")
    source_group.add_argument("--file", help="File path to upload as source")

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
    p_audio.add_argument("--output", help="Output file path (default: auto-generated)")

    args = parser.parse_args()

    if args.command == "create-notebook":
        create_notebook(title=args.title, description=args.description)
    elif args.command == "list-notebooks":
        list_notebooks()
    elif args.command == "delete-notebook":
        delete_notebook(args.notebook)
    elif args.command == "add-source":
        if args.text:
            add_text_source(args.notebook, args.text, display_name=args.name)
        elif args.url:
            add_url_source(args.notebook, args.url, display_name=args.name)
        elif args.file:
            add_file_source(args.notebook, args.file, display_name=args.name)
    elif args.command == "list-sources":
        list_sources(args.notebook)
    elif args.command == "delete-source":
        delete_source(args.notebook, args.source)
    elif args.command == "generate-audio":
        generate_audio_overview(args.notebook, output_path=args.output)


if __name__ == "__main__":
    main()
