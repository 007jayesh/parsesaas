from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from models.user import UserResponse
from services.auth import get_current_user
from services.docling_parser import get_docling_parser
from services.converter import converter
import uuid
import json
from datetime import datetime
import base64
import time

router = APIRouter(prefix="/fast", tags=["fast_conversion"])

@router.post("/convert")
async def fast_convert_bank_statement(
    file: UploadFile = File(...),
    output_formats: str = Form("csv"),
    current_user: UserResponse = Depends(get_current_user)
):
    """Ultra-fast conversion without streaming - for performance comparison"""
    
    start_time = time.time()
    
    # Validate file type
    if not file.content_type == "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Check file size (10MB limit)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 10MB"
        )
    
    # Parse output formats
    requested_formats = [fmt.strip().lower() for fmt in output_formats.split(",")]
    valid_formats = ["csv", "excel", "json"]
    requested_formats = [fmt for fmt in requested_formats if fmt in valid_formats]
    
    if not requested_formats:
        requested_formats = ["csv"]
    
    try:
        # Get docling parser
        docling_parser = get_docling_parser()
        
        # Check page count and credits
        pages_processed = docling_parser.get_pdf_page_count(file_content)
        if current_user.credits < pages_processed:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits. Need {pages_processed} credits, you have {current_user.credits}"
            )
        
        # Direct processing without streaming overhead
        parsed_data = await docling_parser.parse_bank_statement(file_content)
        
        # Convert to requested formats
        converted_data = converter.convert_to_formats(parsed_data, requested_formats)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Prepare result
        result_data = {
            "conversion_id": str(uuid.uuid4()),
            "status": "completed",
            "pages_processed": pages_processed,
            "credits_used": pages_processed,
            "processing_method": "docling_fast",
            "processing_time_seconds": round(processing_time, 2)
        }
        
        # Add format data
        if "csv" in requested_formats and "csv" in converted_data:
            result_data["csv_data"] = converted_data["csv"]
        if "excel" in requested_formats and "excel" in converted_data:
            excel_bytes = converted_data["excel"]
            result_data["excel_data"] = base64.b64encode(excel_bytes).decode("utf-8")
        if "json" in requested_formats and "json" in converted_data:
            result_data["json_data"] = json.loads(converted_data["json"])
        
        print(f"FAST CONVERT: Total processing time: {processing_time:.2f} seconds")
        
        return result_data
        
    except Exception as e:
        processing_time = time.time() - start_time
        print(f"FAST CONVERT ERROR after {processing_time:.2f}s: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fast conversion failed: {str(e)}"
        )