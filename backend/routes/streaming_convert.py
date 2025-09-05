from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from models.user import UserResponse
from services.auth import get_current_user
from services.docling_parser import get_docling_parser
from services.converter import converter
from database import db
import uuid
import json
from datetime import datetime
import base64
import asyncio
import time
import tempfile
import os
import random

router = APIRouter(prefix="/streaming", tags=["streaming"])

class StreamingDoclingParser:
    def __init__(self):
        self.parser = get_docling_parser()
    
    async def stream_processing(self, pdf_content: bytes, output_formats: list, user: UserResponse):
        """Stream processing updates as Server-Sent Events"""
        
        try:
            start_time = time.time()
            
            # Stage 1: Upload complete
            yield self._create_sse_message("progress", {
                "stage": "📁 File uploaded successfully",
                "stage_index": 0,
                "progress": 10
            })
            
            # Get page count
            yield self._create_sse_message("progress", {
                "stage": "🔍 Analyzing PDF structure...",
                "stage_index": 1,
                "progress": 15
            })
            
            pages_processed = self.parser.get_pdf_page_count(pdf_content)
            
            # Check credits
            if user.credits < pages_processed:
                yield self._create_sse_message("error", {
                    "error": f"Insufficient credits. Need {pages_processed}, have {user.credits}"
                })
                return
            
            yield self._create_sse_message("progress", {
                "stage": f"📄 Starting extraction of {pages_processed} pages...",
                "stage_index": 1,
                "progress": 20,
                "pages_total": pages_processed
            })
            
            # Generate conversion ID but defer database operations
            conversion_id = str(uuid.uuid4())
            
            # Stage 2: Extract text with real docling output streaming
            yield self._create_sse_message("progress", {
                "stage": "📄 Converting PDF to structured format...",
                "stage_index": 1,
                "progress": 25
            })
            
            # Get pages text with streaming
            pages_text = []
            async for update in self._get_pdf_pages_text_streaming(pdf_content, pages_processed):
                if update["type"] == "docling_output":
                    yield self._create_sse_message("docling_output", update["data"])
                elif update["type"] == "progress":
                    yield self._create_sse_message("progress", update["data"])
                elif update["type"] == "pages_text":
                    pages_text = update["data"]
                    break
            
            if not pages_text:
                yield self._create_sse_message("error", {"error": "No text could be extracted from the PDF"})
                return
            
            # Stage 3: Document Processing  
            yield self._create_sse_message("progress", {
                "stage": "⚡ Processing document structure...",
                "stage_index": 2,
                "progress": 60
            })
            
            # Process with original parser logic
            first_page_transactions, headers = await self.parser._process_first_page_async(pages_text[0])
            all_transactions = first_page_transactions
            
            yield self._create_sse_message("progress", {
                "stage": f"📋 Detected {len(headers)} data columns",
                "stage_index": 2,
                "progress": 70,
                "headers_detected": len(headers)
            })
            
            # Process remaining pages
            if headers and len(pages_text) > 1:
                remaining_pages_text = pages_text[1:]
                tasks = [
                    self.parser._process_subsequent_page_async(text, i + 2, headers) 
                    for i, text in enumerate(remaining_pages_text)
                ]
                
                results_from_other_pages = await asyncio.gather(*tasks)
                
                for i, transaction_list in enumerate(results_from_other_pages):
                    all_transactions.extend(transaction_list)
                    progress = 70 + (i + 1) / len(results_from_other_pages) * 15  # 70-85%
                    yield self._create_sse_message("progress", {
                        "stage": f"📊 Processed page {i + 2}",
                        "stage_index": 2,
                        "progress": progress,
                        "transactions_found": len(all_transactions)
                    })
            
            # Stage 4: Generate outputs
            yield self._create_sse_message("progress", {
                "stage": "📊 Generating output files...",
                "stage_index": 3,
                "progress": 90
            })
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Create standard format
            processed_data = self.parser._create_standard_format(all_transactions, headers)
            processed_data["metadata"] = {
                "pages_processed": pages_processed,
                "total_transactions": len(all_transactions),
                "processing_method": "docling",
                "processing_time_seconds": round(processing_time, 2),
                "detected_headers": headers
            }
            
            yield self._create_sse_message("progress", {
                "stage": "✅ Processing complete!",
                "stage_index": 4,
                "progress": 100,
                "transactions_total": len(all_transactions)
            })
            
            # Now do the heavy I/O operations after core processing is done
            # Convert to requested formats
            converted_data = converter.convert_to_formats(processed_data, output_formats)
            
            # Create conversion record
            conversion_data = {
                "id": conversion_id,
                "user_id": user.id,
                "file_name": "uploaded_file.pdf",
                "file_size": len(pdf_content),
                "output_formats": output_formats,
                "status": "completed",
                "pages_processed": pages_processed,
                "credits_used": pages_processed,
                "processed_data": processed_data,
                "completed_at": datetime.utcnow().isoformat()
            }
            
            # Do all database operations in parallel
            await asyncio.gather(
                db.create_conversion(conversion_data),
                db.update_user_credits(user.id, user.credits - pages_processed),
                db.create_credit_transaction({
                    "user_id": user.id,
                    "amount": -pages_processed,
                    "transaction_type": "conversion",
                    "description": f"PDF conversion - streaming",
                    "conversion_id": conversion_id
                })
            )
            
            # Prepare result
            result_data = {
                "conversion_id": conversion_id,
                "status": "completed",
                "pages_processed": pages_processed,
                "credits_used": pages_processed,
                "processing_method": "docling",
                "processing_time_seconds": round(processing_time, 2)
            }
            
            # Add format data
            if "csv" in output_formats and "csv" in converted_data:
                result_data["csv_data"] = converted_data["csv"]
            if "excel" in output_formats and "excel" in converted_data:
                excel_bytes = converted_data["excel"]
                result_data["excel_data"] = base64.b64encode(excel_bytes).decode("utf-8")
            if "json" in output_formats and "json" in converted_data:
                result_data["json_data"] = json.loads(converted_data["json"])
            
            yield self._create_sse_message("completion", {"result": result_data})
            
        except Exception as e:
            yield self._create_sse_message("error", {"error": str(e)})
    
    async def _get_pdf_pages_text_streaming(self, pdf_content: bytes, total_pages: int):
        """Extract pages with real-time streaming of docling output"""
        from docling.document_converter import DocumentConverter
        
        pages_text = []
        
        try:
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(pdf_content)
                temp_path = temp_file.name
            
            converter = DocumentConverter()
            conversion_result = converter.convert(temp_path)
            os.unlink(temp_path)
            
            if conversion_result and conversion_result.document:
                document = conversion_result.document
                
                if hasattr(document, 'pages') and document.pages:
                    page_numbers = sorted(document.pages.keys())
                    num_pages = len(page_numbers)
                    
                    for i, page_num in enumerate(page_numbers):
                        try:
                            page_markdown = document.export_to_markdown(page_no=page_num)
                            
                            # Emit sample lines from the actual docling output (only for first few pages)
                            if i < 2:  # Only stream content for first 2 pages to reduce overhead
                                lines = [line.strip() for line in page_markdown.split('\n') if line.strip()]
                                if lines:
                                    # Send a few random lines to show real content
                                    sample_lines = random.sample(lines, min(2, len(lines)))  # Reduced sample size
                                    sample_content = '\n'.join(sample_lines)
                                    
                                    yield {
                                        "type": "docling_output",
                                        "data": {
                                            "content": sample_content,
                                            "page": page_num,
                                            "timestamp": datetime.now().isoformat()
                                        }
                                    }
                            
                            if page_markdown.strip():
                                pages_text.append(page_markdown)
                            
                            # Update progress for this page
                            page_progress = 25 + (i + 1) / num_pages * 35  # 25-60%
                            yield {
                                "type": "progress",
                                "data": {
                                    "stage": f"📄 Processed page {page_num}/{num_pages}",
                                    "stage_index": 1,
                                    "progress": page_progress,
                                    "current_page": page_num,
                                    "total_pages": num_pages
                                }
                            }
                                
                        except Exception as e:
                            continue
            
            yield {"type": "pages_text", "data": pages_text}
            
        except Exception as e:
            yield {
                "type": "error", 
                "data": {"error": f"Failed to extract PDF text: {str(e)}"}
            }
    
    def _create_sse_message(self, event_type: str, data: dict) -> str:
        """Create Server-Sent Event message"""
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

@router.post("/convert")
async def stream_convert_bank_statement(
    file: UploadFile = File(...),
    output_formats: str = Form("csv"),
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
    
    # Parse output formats
    requested_formats = [fmt.strip().lower() for fmt in output_formats.split(",")]
    valid_formats = ["csv", "excel", "json"]
    requested_formats = [fmt for fmt in requested_formats if fmt in valid_formats]
    
    if not requested_formats:
        requested_formats = ["csv"]
    
    # Create streaming parser
    streaming_parser = StreamingDoclingParser()
    
    # Return streaming response
    return StreamingResponse(
        streaming_parser.stream_processing(file_content, requested_formats, current_user),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )