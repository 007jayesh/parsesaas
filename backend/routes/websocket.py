from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
import uuid
import tempfile
import os
import time
import random
from services.docling_parser import get_docling_parser
from services.converter import converter
from database import db
from datetime import datetime
import base64

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.processing_tasks: Dict[str, asyncio.Task] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.processing_tasks:
            task = self.processing_tasks[session_id]
            if not task.done():
                task.cancel()
            del self.processing_tasks[session_id]
    
    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(message))
            except:
                # Connection closed, remove it
                self.disconnect(session_id)

manager = ConnectionManager()

class StreamingDoclingParser:
    def __init__(self, session_id: str, manager: ConnectionManager):
        self.session_id = session_id
        self.manager = manager
        self.parser = get_docling_parser()
    
    async def emit_progress(self, stage: str, data: dict = None):
        """Emit progress update via WebSocket"""
        message = {
            "type": "progress",
            "stage": stage,
            "data": data or {}
        }
        await self.manager.send_message(self.session_id, message)
    
    async def emit_docling_output(self, content: str, page_num: int = None):
        """Emit real docling markdown output"""
        message = {
            "type": "docling_output",
            "content": content[:500],  # Limit content length
            "page": page_num,
            "timestamp": datetime.now().isoformat()
        }
        await self.manager.send_message(self.session_id, message)
    
    async def emit_error(self, error: str):
        """Emit error message"""
        message = {
            "type": "error",
            "error": error
        }
        await self.manager.send_message(self.session_id, message)
    
    async def emit_completion(self, result: dict):
        """Emit completion with results"""
        message = {
            "type": "completion",
            "result": result
        }
        await self.manager.send_message(self.session_id, message)
    
    async def process_pdf_with_streaming(self, pdf_content: bytes, output_formats: list, user: UserResponse):
        """Process PDF with real-time streaming updates"""
        try:
            # Stage 1: Upload complete
            await self.emit_progress("📤 File uploaded successfully", {
                "stage_index": 0,
                "progress": 10
            })
            
            # Get page count
            await self.emit_progress("📄 Analyzing PDF structure...", {
                "stage_index": 1,
                "progress": 15
            })
            
            pages_processed = self.parser.get_pdf_page_count(pdf_content)
            
            # Check credits
            if user.credits < pages_processed:
                await self.emit_error(f"Insufficient credits. Need {pages_processed}, have {user.credits}")
                return
            
            await self.emit_progress(f"📑 Starting extraction of {pages_processed} pages...", {
                "stage_index": 1,
                "progress": 20,
                "pages_total": pages_processed
            })
            
            # Create conversion record
            conversion_id = str(uuid.uuid4())
            conversion_data = {
                "id": conversion_id,
                "user_id": user.id,
                "file_name": "uploaded_file.pdf",
                "file_size": len(pdf_content),
                "output_formats": output_formats,
                "status": "processing"
            }
            
            conversion = await db.create_conversion(conversion_data)
            if not conversion:
                await self.emit_error("Failed to create conversion record")
                return
            
            # Stage 2: Extract text with real docling output
            await self.emit_progress("📑 Converting PDF to structured format...", {
                "stage_index": 1,
                "progress": 25
            })
            
            # Get pages text with streaming
            pages_text = await self._get_pdf_pages_text_streaming(pdf_content)
            
            if not pages_text:
                await self.emit_error("No text could be extracted from the PDF")
                return
            
            # Stage 3: AI Processing
            await self.emit_progress("🤖 Processing document with AI...", {
                "stage_index": 2,
                "progress": 60
            })
            
            # Process with original parser logic
            first_page_transactions, headers = await self.parser._process_first_page_async(pages_text[0])
            all_transactions = first_page_transactions
            
            await self.emit_progress(f"🧠 Detected {len(headers)} data columns", {
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
                    await self.emit_progress(f"📊 Processed page {i + 2}", {
                        "stage_index": 2,
                        "progress": progress,
                        "transactions_found": len(all_transactions)
                    })
            
            # Stage 4: Generate outputs
            await self.emit_progress("📊 Generating output files...", {
                "stage_index": 3,
                "progress": 90
            })
            
            # Create standard format
            processed_data = self.parser._create_standard_format(all_transactions, headers)
            processed_data["metadata"] = {
                "pages_processed": pages_processed,
                "total_transactions": len(all_transactions),
                "processing_method": "docling",
                "detected_headers": headers
            }
            
            # Convert to requested formats
            converted_data = converter.convert_to_formats(processed_data, output_formats)
            
            # Update user credits
            new_credits = user.credits - pages_processed
            await db.update_user_credits(user.id, new_credits)
            
            # Create credit transaction
            await db.create_credit_transaction({
                "user_id": user.id,
                "amount": -pages_processed,
                "transaction_type": "conversion",
                "description": f"PDF conversion - streaming",
                "conversion_id": conversion_id
            })
            
            # Update conversion record
            await db.update_conversion(conversion_id, {
                "status": "completed",
                "pages_processed": pages_processed,
                "credits_used": pages_processed,
                "processed_data": processed_data,
                "completed_at": datetime.utcnow().isoformat()
            })
            
            # Prepare result
            result_data = {
                "conversion_id": conversion_id,
                "status": "completed",
                "pages_processed": pages_processed,
                "credits_used": pages_processed,
                "processing_method": "docling"
            }
            
            # Add format data
            if "csv" in output_formats and "csv" in converted_data:
                result_data["csv_data"] = converted_data["csv"]
            if "excel" in output_formats and "excel" in converted_data:
                excel_bytes = converted_data["excel"]
                result_data["excel_data"] = base64.b64encode(excel_bytes).decode("utf-8")
            if "json" in output_formats and "json" in converted_data:
                result_data["json_data"] = json.loads(converted_data["json"])
            
            await self.emit_progress("✅ Processing complete!", {
                "stage_index": 4,
                "progress": 100,
                "transactions_total": len(all_transactions)
            })
            
            await self.emit_completion(result_data)
            
        except Exception as e:
            await self.emit_error(str(e))
    
    async def _get_pdf_pages_text_streaming(self, pdf_content: bytes):
        """Extract pages with real-time streaming of docling output"""
        import tempfile
        import os
        import time
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
                            
                            # Emit sample lines from the actual docling output
                            lines = [line.strip() for line in page_markdown.split('\n') if line.strip()]
                            if lines:
                                # Send a few random lines to show real content
                                import random
                                sample_lines = random.sample(lines, min(3, len(lines)))
                                sample_content = '\n'.join(sample_lines)
                                await self.emit_docling_output(sample_content, page_num)
                            
                            if page_markdown.strip():
                                pages_text.append(page_markdown)
                            
                            # Update progress for this page
                            page_progress = 25 + (i + 1) / num_pages * 35  # 25-60%
                            await self.emit_progress(f"📄 Processed page {page_num}/{num_pages}", {
                                "stage_index": 1,
                                "progress": page_progress,
                                "current_page": page_num,
                                "total_pages": num_pages
                            })
                            
                            # Small delay to make streaming visible
                            await asyncio.sleep(0.5)
                                
                        except Exception as e:
                            continue
            
            return pages_text
            
        except Exception as e:
            await self.emit_error(f"Failed to extract PDF text: {str(e)}")
            return []

@router.websocket("/ws/convert/{session_id}")
async def websocket_convert(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Wait for processing request
            data = await websocket.receive_text()
            
            try:
                request = json.loads(data)
                
                if request.get("type") == "start_conversion":
                    # Get user info from token
                    token = request.get("token")
                    if not token:
                        await manager.send_message(session_id, {
                            "type": "error",
                            "error": "Authentication token required"
                        })
                        continue
                    
                    try:
                        user = await get_current_user_websocket(token)
                    except Exception as e:
                        await manager.send_message(session_id, {
                            "type": "error",
                            "error": "Authentication failed"
                        })
                        continue
                    
                    file_data = request.get("file_data")
                    output_formats = request.get("output_formats", ["csv"])
                    
                    if not file_data:
                        await manager.send_message(session_id, {
                            "type": "error", 
                            "error": "File data required"
                        })
                        continue
                    
                    # Decode base64 file content
                    import base64
                    pdf_content = base64.b64decode(file_data)
                    
                    # Start processing
                    streaming_parser = StreamingDoclingParser(session_id, manager)
                    task = asyncio.create_task(
                        streaming_parser.process_pdf_with_streaming(pdf_content, output_formats, user)
                    )
                    manager.processing_tasks[session_id] = task
                    await task
                    
            except json.JSONDecodeError:
                await manager.send_message(session_id, {
                    "type": "error",
                    "error": "Invalid JSON data"
                })
            except Exception as e:
                await manager.send_message(session_id, {
                    "type": "error", 
                    "error": str(e)
                })
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)