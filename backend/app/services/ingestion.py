import io
import csv
import json
import zipfile
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from app.models.source import SourceType
from app.services.chunker import DeterministicChunker

class IngestionEngine:
    """
    Parses authorized project sources into deterministic chunks with traceable metadata.
    """

    @classmethod
    def parse_markdown(cls, source_id: str, content_str: str) -> List[Dict[str, Any]]:
        return DeterministicChunker.chunk_text(source_id=source_id, text=content_str)

    @classmethod
    def parse_pdf(cls, source_id: str, file_bytes: bytes) -> List[Dict[str, Any]]:
        reader = PdfReader(io.BytesIO(file_bytes))
        all_chunks = []
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            chunks = DeterministicChunker.chunk_text(
                source_id=source_id, 
                text=page_text, 
                page_number=page_idx + 1
            )
            all_chunks.extend(chunks)
        # Re-index chunks monotonically
        for idx, chunk in enumerate(all_chunks):
            chunk["chunk_index"] = idx
            chunk["id"] = f"{source_id}_chunk_{idx:03d}"
        return all_chunks

    @classmethod
    def parse_csv(cls, source_id: str, content_str: str) -> List[Dict[str, Any]]:
        f = io.StringIO(content_str)
        reader = csv.DictReader(f)
        formatted_rows = []
        for row in reader:
            row_repr = " | ".join(f"{k}: {v}" for k, v in row.items() if v)
            formatted_rows.append(row_repr)
        text = "\n".join(formatted_rows)
        return DeterministicChunker.chunk_text(source_id=source_id, text=text)

    @classmethod
    def parse_json(cls, source_id: str, content_str: str) -> List[Dict[str, Any]]:
        try:
            data = json.loads(content_str)
        except Exception:
            return DeterministicChunker.chunk_text(source_id=source_id, text=content_str)

        formatted_items = []
        if isinstance(data, list):
            for item in data:
                formatted_items.append(json.dumps(item, indent=2))
        elif isinstance(data, dict):
            for key, val in data.items():
                formatted_items.append(f"### {key}\n{json.dumps(val, indent=2)}")
        else:
            formatted_items.append(str(data))
            
        text = "\n\n".join(formatted_items)
        return DeterministicChunker.chunk_text(source_id=source_id, text=text)

    @classmethod
    def parse_chat(cls, source_id: str, content_str: str) -> List[Dict[str, Any]]:
        # Format chat transcript with message boundaries
        lines = content_str.splitlines()
        grouped_messages = []
        current_msg = []
        for line in lines:
            if line.startswith("[") or (":" in line and any(role in line.lower() for role in ["alex", "elena", "marcus", "dev", "lead", "pm"])):
                if current_msg:
                    grouped_messages.append("\n".join(current_msg))
                    current_msg = []
            current_msg.append(line)
        if current_msg:
            grouped_messages.append("\n".join(current_msg))

        text = "\n\n".join(grouped_messages) if grouped_messages else content_str
        return DeterministicChunker.chunk_text(source_id=source_id, text=text, chunk_size=1500, overlap=300)

    @classmethod
    def parse_repo_export(cls, source_id: str, file_bytes: bytes) -> List[Dict[str, Any]]:
        all_chunks = []
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                idx = 0
                for file_info in z.infolist():
                    if file_info.is_dir():
                        continue
                    # Only parse documentation, code, config files
                    fname = file_info.filename.lower()
                    if any(fname.endswith(ext) for ext in [".md", ".txt", ".yaml", ".yml", ".json", ".py", ".cpp", ".h", ".sh", ".toml", ".rst"]):
                        with z.open(file_info) as f:
                            try:
                                content = f.read().decode("utf-8", errors="ignore")
                                if content.strip():
                                    header = f"=== File: {file_info.filename} ===\n"
                                    file_chunks = DeterministicChunker.chunk_text(
                                        source_id=source_id, 
                                        text=header + content
                                    )
                                    all_chunks.extend(file_chunks)
                            except Exception:
                                continue
        except Exception:
            # Not a zip, fallback to plaintext
            return DeterministicChunker.chunk_text(source_id=source_id, text=file_bytes.decode("utf-8", errors="ignore"))

        for idx, chunk in enumerate(all_chunks):
            chunk["chunk_index"] = idx
            chunk["id"] = f"{source_id}_chunk_{idx:03d}"
        return all_chunks

