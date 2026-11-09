import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Boolean, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.project import SensitivityLevel

class SourceType(str, enum.Enum):
    REPO = "repo"
    MARKDOWN = "markdown"
    PDF = "pdf"
    CSV = "csv"
    JSON = "json"
    CHAT = "chat"

class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(Enum(SourceType), nullable=False)
    sensitivity = Column(Enum(SensitivityLevel), default=SensitivityLevel.INTERNAL, nullable=False)
    consent_confirmed = Column(Boolean, default=True, nullable=False)
    storage_path = Column(String(500), nullable=True)
    sha256_hash = Column(String(64), nullable=True)
    source_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="sources")
    chunks = relationship("SourceChunk", back_populates="source", cascade="all, delete-orphan")

class SourceChunk(Base):
    __tablename__ = "source_chunks"

    id = Column(String(64), primary_key=True, index=True)  # stable chunk id, e.g. src_abc_chunk_1
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)  # Redacted/processed content
    original_content = Column(Text, nullable=False)  # Secured raw content
    line_start = Column(Integer, nullable=True)
    line_end = Column(Integer, nullable=True)
    page_number = Column(Integer, nullable=True)
    byte_offset_start = Column(Integer, nullable=True)
    byte_offset_end = Column(Integer, nullable=True)
    pii_redacted_meta = Column(JSON, default=list)
    embedding = Column(JSON, nullable=True)  # Float array vector
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    source = relationship("Source", back_populates="chunks")

