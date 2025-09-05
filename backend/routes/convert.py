from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import Response
from models.user import UserResponse
from models.conversion import ConversionResponse, ConversionResult
from services.auth import get_current_user
from services.docling_parser import get_docling_parser
from services.converter import converter
from database import db
import uuid
import json
from datetime import datetime
import base64

router = APIRouter(prefix="/convert", tags=["conversion"])

@router.post("/upload", response_model=ConversionResult)
async def convert_bank_statement(
    file: UploadFile = File(...),
    output_formats: str = Form("csv"),  # comma-separated: "csv,excel,json"
    current_user: UserResponse = Depends(get_current_user)
):
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
    
    # Using Docling method for all processing
    
    print(f"DEBUG: Raw output_formats parameter: {output_formats}")
    # Parse output formats
    requested_formats = [fmt.strip().lower() for fmt in output_formats.split(",")]
    valid_formats = ["csv", "excel", "json"]
    requested_formats = [fmt for fmt in requested_formats if fmt in valid_formats]
    
    if not requested_formats:
        requested_formats = ["csv"]
    
    # Create conversion record
    conversion_id = str(uuid.uuid4())
    conversion_data = {
        "id": conversion_id,
        "user_id": current_user.id,
        "file_name": file.filename,
        "file_size": len(file_content),
        "output_formats": requested_formats,
        "status": "processing"
    }
    
    conversion = await db.create_conversion(conversion_data)
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversion record"
        )
    
    try:
        # Get page count before full parsing for credit check
        docling_parser = get_docling_parser()
        pages_processed = docling_parser.get_pdf_page_count(file_content)

        # Check if user has enough credits
        if current_user.credits < pages_processed:
            await db.update_conversion(conversion_id, {
                "status": "failed",
                "error_message": f"Insufficient credits. Need {pages_processed}, have {current_user.credits}",
                "completed_at": datetime.utcnow().isoformat()
            })
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits. Need {pages_processed} credits, you have {current_user.credits}"
            )

        # Parse PDF using Docling method
        parsed_data = await docling_parser.parse_bank_statement(file_content)
        
        # Convert to requested formats
        print(f"DEBUG: Requested formats: {requested_formats}")
        print(f"DEBUG: Parsed data keys: {parsed_data.keys()}")
        converted_data = converter.convert_to_formats(parsed_data, requested_formats)
        print(f"DEBUG: Converted data keys: {converted_data.keys()}")
        print("DEBUG: Excel in converted_data:", "excel" in converted_data)
        
        # Update user credits
        new_credits = current_user.credits - pages_processed
        await db.update_user_credits(current_user.id, new_credits)
        
        # Create credit transaction
        await db.create_credit_transaction({
            "user_id": current_user.id,
            "amount": -pages_processed,
            "transaction_type": "conversion",
            "description": f"PDF conversion - {file.filename}",
            "conversion_id": conversion_id
        })
        
        # Update conversion record with actual pages processed from parsing result
        actual_pages_processed = parsed_data.get("metadata", {}).get("pages_processed", pages_processed)
        
        print(f"DEBUG: pages_processed={pages_processed}, actual_pages_processed={actual_pages_processed}")
        print(f"DEBUG: parsed_data metadata keys: {parsed_data.get('metadata', {}).keys()}")
        
        await db.update_conversion(conversion_id, {
            "status": "completed",
            "pages_processed": actual_pages_processed,
            "credits_used": pages_processed,  # Credits still based on initial page count
            "processed_data": parsed_data,
            "completed_at": datetime.utcnow().isoformat()
        })
        
        # Prepare response - only include requested formats
        result_data = {
            "conversion_id": conversion_id,
            "status": "completed",
            "pages_processed": actual_pages_processed,  # Use actual pages from processing
            "credits_used": pages_processed,  # Credits based on initial page count
            "processing_method": parsed_data.get("metadata", {}).get("processing_method", "docling"),
            "processing_time_seconds": parsed_data.get("metadata", {}).get("processing_time_seconds", 0.0),
            "transactions": parsed_data.get("transactions", [])  # Add transactions for frontend table
        }
        
        print(f"DEBUG: result_data before validation: {result_data}")
        
        # Only add format data that was actually requested and generated
        if "csv" in requested_formats and "csv" in converted_data:
            result_data["csv_data"] = converted_data["csv"]
        if "excel" in requested_formats and "excel" in converted_data:
            try:
                excel_bytes = converted_data["excel"]
                if excel_bytes is None:
                    print("DEBUG: Excel data is None")
                else:
                    print(f"DEBUG: Excel data type: {type(excel_bytes)}, length: {len(excel_bytes) if hasattr(excel_bytes, '__len__') else 'N/A'}")
                    result_data["excel_data"] = base64.b64encode(excel_bytes).decode("utf-8")
            except Exception as excel_error:
                print(f"DEBUG: Excel encoding error: {excel_error}")
                print(f"DEBUG: Excel data: {converted_data['excel']}")
                raise excel_error
        if "json" in requested_formats and "json" in converted_data:
            # Convert JSON string back to dictionary for the API response model
            try:
                result_data["json_data"] = json.loads(converted_data["json"])
            except (json.JSONDecodeError, TypeError) as json_error:
                print(f"DEBUG: JSON parsing error: {json_error}")
                print(f"DEBUG: JSON data type: {type(converted_data['json'])}")
                result_data["json_data"] = None
        
        try:
            result = ConversionResult(**result_data)
            print(f"DEBUG: ConversionResult created successfully")
            return result
        except Exception as validation_error:
            print(f"DEBUG: ConversionResult validation error: {validation_error}")
            print(f"DEBUG: result_data keys: {result_data.keys()}")
            print(f"DEBUG: result_data values: {result_data}")
            raise validation_error
        
    except Exception as e:
        # Update conversion record with error
        await db.update_conversion(conversion_id, {
            "status": "failed",
            "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat()
        })
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversion failed: {str(e)}"
        )

@router.get("/download/{conversion_id}/{format}")
async def download_converted_file(
    conversion_id: str,
    format: str,
    current_user: UserResponse = Depends(get_current_user)
):
    # Get conversion record
    conversions = await db.get_user_conversions(current_user.id, 100)
    conversion = next((c for c in conversions if c["id"] == conversion_id), None)
    
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversion not found"
        )
    
    if conversion["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversion not completed"
        )
    
    # Get processed data
    parsed_data = conversion.get("processed_data")
    if not parsed_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processed data not found"
        )
    
    # Convert to requested format
    try:
        if format.lower() == "csv":
            data = converter.to_csv(parsed_data)
            return Response(
                content=data,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}.csv"}
            )
        elif format.lower() == "excel":
            data = converter.to_excel(parsed_data)
            return Response(
                content=data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}.xlsx"}
            )
        elif format.lower() == "json":
            data = converter.to_json(parsed_data)
            return Response(
                content=data,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}.json"}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: csv, excel, json"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate download: {str(e)}"
        )

@router.get("/history", response_model=list[ConversionResponse])
async def get_conversion_history(current_user: UserResponse = Depends(get_current_user)):
    conversions = await db.get_user_conversions(current_user.id, 20)
    return [ConversionResponse(**conversion) for conversion in conversions]