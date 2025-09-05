from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from pydantic import BaseModel
from fastapi.responses import Response
from models.user import UserResponse
from models.conversion import ConversionResponse, ConversionResult
from services.auth import get_current_user
from services.table_extractor import table_extractor
from services.converter import converter
from database import db
import uuid
import json
import time
from datetime import datetime
import base64

router = APIRouter(prefix="/table-convert", tags=["table-conversion"])

@router.post("/upload-fast", response_model=ConversionResult)
async def convert_bank_statement_fast(
    file: UploadFile = File(...),
    output_formats: str = Form("csv"),  # comma-separated: "csv,excel,json"
    current_user: UserResponse = Depends(get_current_user)
):
    """Fast Table Extraction - Config 4: Cell Matching OFF + FAST Mode"""
    return await _convert_with_config(file, output_formats, "fast", current_user)

@router.post("/upload-accurate", response_model=ConversionResult)
async def convert_bank_statement_accurate(
    file: UploadFile = File(...),
    output_formats: str = Form("csv"),  # comma-separated: "csv,excel,json"
    current_user: UserResponse = Depends(get_current_user)
):
    """Accurate Table Extraction - Config 2: Cell Matching OFF + ACCURATE Mode"""
    return await _convert_with_config(file, output_formats, "accurate", current_user)

@router.post("/upload-standard", response_model=ConversionResult)
async def convert_bank_statement_standard(
    file: UploadFile = File(...),
    output_formats: str = Form("csv"),  # comma-separated: "csv,excel,json"
    current_user: UserResponse = Depends(get_current_user)
):
    """Standard Table Extraction - Original Configuration"""
    return await _convert_with_config(file, output_formats, "standard", current_user)

async def _convert_with_config(
    file: UploadFile,
    output_formats: str,
    config: str,
    current_user: UserResponse
) -> ConversionResult:
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
        start_time = time.time()
        
        # Step 1: Extract tables from PDF
        print("="*60)
        print(f"METHOD 2: Table Extraction Starting with {config.upper()} mode")
        print("="*60)
        
        try:
            extraction_start = time.time()
            print(f"Starting table extraction for file: {file.filename}")
            print(f"File size: {len(file_content)} bytes")
            print(f"Configuration: {config}")
            raw_tables_data = table_extractor.extract_tables_from_pdf(file_content, config)
            extraction_end = time.time()
            print(f"Table extraction completed successfully")
            print(f"Raw tables data keys: {list(raw_tables_data.keys())}")
            print(f"Raw tables data: {raw_tables_data}")
        except Exception as extraction_error:
            print(f"ERROR in table extraction: {str(extraction_error)}")
            print(f"Error type: {type(extraction_error)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise extraction_error
        
        if 'error' in raw_tables_data:
            raise Exception(raw_tables_data['error'])
        
        print(f"✅ PDF extraction completed in {extraction_end - extraction_start:.2f} seconds")
        print(f"⚡ Docling execution time: {raw_tables_data.get('execution_time_seconds', 0):.2f} seconds")
        print(f"🔧 Configuration: {raw_tables_data.get('config_name', 'Default')}")
        print(f"📊 Found {raw_tables_data['number_of_tables']} tables")
        print(f"📄 Pages processed: {raw_tables_data.get('pages_processed', 1)}")
        
        pages_processed = raw_tables_data.get('pages_processed', 1)
        print(f"DEBUG: pages_processed = {pages_processed}, user credits = {current_user.credits}")
        
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
        
        # Step 2: Process tables sequentially
        try:
            print("Starting table processing...")
            processing_start = time.time()
            final_df, sample_transactions, table_info, processed_individual_tables = table_extractor.process_tables_sequentially(raw_tables_data)
            processing_end = time.time()
            print(f"Table processing completed. DataFrame shape: {final_df.shape if not final_df.empty else 'Empty'}")
        except Exception as processing_error:
            print(f"ERROR in table processing: {str(processing_error)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise processing_error
        
        # Step 3: Convert to structured format
        try:
            print("Converting to structured format...")
            total_time = time.time() - start_time
            parsed_data = table_extractor.convert_to_structured_format(final_df, table_info)
            parsed_data["metadata"]["processing_time_seconds"] = total_time
            parsed_data["metadata"]["pages_processed"] = pages_processed
            parsed_data["metadata"]["raw_tables"] = processed_individual_tables
            print(f"Structured format conversion completed. Found {len(parsed_data.get('transactions', []))} transactions")
        except Exception as format_error:
            print(f"ERROR in structured format conversion: {str(format_error)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise format_error
        
        print(f"✅ Table processing completed in {processing_end - processing_start:.2f} seconds")
        print(f"📊 Total transactions extracted: {len(parsed_data['transactions'])}")
        print(f"⏱️ TOTAL TIME: {total_time:.2f} seconds")
        print("="*60)
        
        # Convert to requested formats
        try:
            print("Converting to requested formats...")
            print(f"Requested formats: {requested_formats}")
            converted_data = converter.convert_to_formats(parsed_data, requested_formats)
            print(f"Format conversion completed successfully")
        except Exception as conversion_error:
            print(f"ERROR in format conversion: {str(conversion_error)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise conversion_error
        
        # Update user credits
        try:
            print("Updating user credits...")
            new_credits = current_user.credits - pages_processed
            await db.update_user_credits(current_user.id, new_credits)
            print(f"User credits updated: {current_user.credits} -> {new_credits}")
        except Exception as credits_error:
            print(f"ERROR updating user credits: {str(credits_error)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise credits_error
        
        # Create credit transaction
        try:
            print("Creating credit transaction...")
            await db.create_credit_transaction({
                "user_id": current_user.id,
                "amount": -pages_processed,
                "transaction_type": "conversion",
                "description": f"PDF conversion (Method 2) - {file.filename}",
                "conversion_id": conversion_id
            })
            print("Credit transaction created successfully")
        except Exception as transaction_error:
            print(f"ERROR creating credit transaction: {str(transaction_error)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise transaction_error
        
        # Update conversion record
        try:
            print("Updating conversion record...")
            await db.update_conversion(conversion_id, {
                "status": "completed",
                "pages_processed": pages_processed,
                "credits_used": pages_processed,
                "processed_data": parsed_data,
                "completed_at": datetime.utcnow().isoformat()
            })
            print("Conversion record updated successfully")
        except Exception as update_error:
            print(f"ERROR updating conversion record: {str(update_error)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise update_error
        
        # Prepare response
        result_data = {
            "conversion_id": conversion_id,
            "status": "completed",
            "pages_processed": pages_processed,
            "credits_used": pages_processed,
            "processing_method": "table_extraction",
            "processing_time_seconds": total_time,
            "transactions": parsed_data.get("transactions", []),
            "table_info": parsed_data.get("metadata", {}).get("table_info", [])
        }
        
        # Add format data
        if "csv" in requested_formats and "csv" in converted_data:
            result_data["csv_data"] = converted_data["csv"]
        if "excel" in requested_formats and "excel" in converted_data:
            excel_bytes = converted_data["excel"]
            result_data["excel_data"] = base64.b64encode(excel_bytes).decode("utf-8")
        if "json" in requested_formats and "json" in converted_data:
            result_data["json_data"] = json.loads(converted_data["json"])
        
        result = ConversionResult(**result_data)
        return result
        
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

@router.post("/upload", response_model=ConversionResult)
async def convert_bank_statement_method2(
    file: UploadFile = File(...),
    output_formats: str = Form("csv"),  # comma-separated: "csv,excel,json"
    config: str = Form("fast"),  # "fast" or "accurate"
    current_user: UserResponse = Depends(get_current_user)
):
    """Default Table Extraction endpoint - supports both fast and accurate modes"""
    return await _convert_with_config(file, output_formats, config, current_user)

class DownloadConfigRequest(BaseModel):
    conversion_id: str
    format: str
    table_config: dict

@router.post("/download-configured")
async def download_configured_file(
    request_data: DownloadConfigRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    conversion_id = request_data.conversion_id
    format = request_data.format
    table_config = request_data.table_config
    
    if not all([conversion_id, format, table_config]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: conversion_id, format, table_config"
        )
    
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
    
    try:
        # Process table configuration to create filtered data
        selected_tables = table_config.get("selectedTables", [])
        output_mode = table_config.get("outputMode", "separate")
        table_info = table_config.get("tableInfo", [])
        
        print(f"Processing configured download:")
        print(f"  Selected tables: {selected_tables}")
        print(f"  Output mode: {output_mode}")
        print(f"  Table info count: {len(table_info)}")
        
        # Filter data based on selected tables
        if selected_tables and table_info:
            filtered_data = converter.filter_data_by_tables(
                parsed_data, 
                selected_tables, 
                table_info, 
                output_mode
            )
        else:
            # If no selection, use all data
            filtered_data = parsed_data
        
        # Convert to requested format
        if format.lower() == "csv":
            data = converter.to_csv(filtered_data)
            return Response(
                content=data,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}_configured.csv"}
            )
        elif format.lower() == "excel":
            data = converter.to_excel_with_config(filtered_data, table_info, selected_tables, output_mode)
            return Response(
                content=data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}_configured.xlsx"}
            )
        elif format.lower() == "json":
            data = converter.to_json(filtered_data)
            return Response(
                content=data,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}_configured.json"}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: csv, excel, json"
            )
    except Exception as e:
        print(f"Error in configured download: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate configured download: {str(e)}"
        )

@router.get("/download/{conversion_id}/{format}")
async def download_converted_file_method2(
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
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}_method2.csv"}
            )
        elif format.lower() == "excel":
            data = converter.to_excel(parsed_data)
            return Response(
                content=data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}_method2.xlsx"}
            )
        elif format.lower() == "json":
            data = converter.to_json(parsed_data)
            return Response(
                content=data,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={conversion['file_name']}_method2.json"}
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