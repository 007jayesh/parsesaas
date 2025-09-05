from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ConversionCreate(BaseModel):
    file_name: str
    file_size: int
    output_formats: List[str] = ["csv"]

class ConversionResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_size: int
    pages_processed: int
    credits_used: int
    status: str
    output_formats: List[str]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

class ConversionResult(BaseModel):
    conversion_id: str
    status: str
    csv_data: Optional[str] = None
    excel_data: Optional[str] = None
    json_data: Optional[Dict[str, Any]] = None
    pages_processed: int
    credits_used: int
    processing_method: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    transactions: Optional[List[Dict[str, Any]]] = None
    table_info: Optional[List[Dict[str, Any]]] = None
