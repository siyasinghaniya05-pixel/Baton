import hashlib
from typing import List, Dict, Any
from app.core.privacy import PrivacyEngine

class DeterministicChunker:
    """
    Splits source documents into deterministic, addressable chunks with stable IDs,
    tracking line numbers, byte offsets, and applying privacy redaction.
    """

    @classmethod
    def chunk_text(
        cls, 
        source_id: str, 
        text: str, 
        chunk_size: int = 1200, 
        overlap: int = 200,
        page_number: int = None
    ) -> List[Dict[str, Any]]:
        if not text:
            return []

        chunks = []
        lines = text.splitlines(keepends=True)
        
        current_chunk_lines = []
        current_len = 0
        current_start_line = 1
        current_byte_offset = 0
        running_line_num = 1
        running_byte_offset = 0

        line_metadata = []
        for line in lines:
            line_len = len(line)
            line_metadata.append({
                "line_num": running_line_num,
                "byte_start": running_byte_offset,
                "byte_end": running_byte_offset + line_len,
                "text": line
            })
            running_line_num += 1
            running_byte_offset += line_len

        i = 0
        chunk_idx = 0
        while i < len(line_metadata):
            start_line_meta = line_metadata[i]
            accumulated_lines = []
            accumulated_text = ""
            accumulated_len = 0
            j = i

            while j < len(line_metadata) and (accumulated_len < chunk_size or len(accumulated_lines) < 3):
                accumulated_lines.append(line_metadata[j])
                accumulated_text += line_metadata[j]["text"]
                accumulated_len += len(line_metadata[j]["text"])
                j += 1

            end_line_meta = accumulated_lines[-1]
            raw_content = accumulated_text.strip()
            
            if raw_content:
                chunk_id = f"{source_id}_chunk_{chunk_idx:03d}"
                
                # Apply privacy redaction before any AI processing
                redacted_content, pii_meta, contains_secret = PrivacyEngine.scan_and_redact(raw_content)

                chunks.append({
                    "id": chunk_id,
                    "chunk_index": chunk_idx,
                    "original_content": raw_content,
                    "content": redacted_content,
                    "line_start": start_line_meta["line_num"],
                    "line_end": end_line_meta["line_num"],
                    "byte_offset_start": start_line_meta["byte_start"],
                    "byte_offset_end": end_line_meta["byte_end"],
                    "page_number": page_number,
                    "pii_redacted_meta": pii_meta,
                    "contains_secrets": contains_secret
                })
                chunk_idx += 1

            # Advance by step size (overlap logic)
            advance_chars = max(chunk_size - overlap, 300)
            chars_advanced = 0
            step = 0
            while i + step < j and chars_advanced < advance_chars:
                chars_advanced += len(line_metadata[i + step]["text"])
                step += 1
            i += max(step, 1)

        return chunks

