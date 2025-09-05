import io
import json
import time
import os
import asyncio
import re
import tempfile
from typing import Dict, Any, List, Tuple
from datetime import datetime
from functools import cached_property

import pandas as pd
from docling.document_converter import DocumentConverter
from services.openrouter_client import create_openrouter_model

class DoclingParser:
    """
    Parses a PDF bank statement using the original bank_parser_py.py approach.
    Adapted for FastAPI integration while preserving verbose logging.
    """
    def __init__(self, api_key: str = None):
        self.method_name = "Docling Two-Stage Parallel Parser"
        
        # Initialize OpenRouter API - try multiple sources
        if api_key:
            effective_api_key = api_key
        else:
            # Try to get from config first, then environment
            try:
                from config import settings
                effective_api_key = settings.openrouter_api_key or settings.gemini_api_key or settings.google_api_key
            except:
                effective_api_key = None
            
            if not effective_api_key:
                effective_api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        
        if not effective_api_key:
            raise ValueError("OpenRouter API key required. Set OPENROUTER_API_KEY environment variable")
            
        self.model = create_openrouter_model(
            api_key=effective_api_key,
            model_name='google/gemini-2.5-flash-lite'
        )
        print("Parser initialized successfully.")

    @cached_property
    def converter(self):
        """Cached DocumentConverter instance."""
        print("   -> Initializing DocumentConverter (cached)")
        return DocumentConverter()

    def get_pdf_page_count(self, pdf_content: bytes) -> int:
        """Get the number of pages from PDF content using Docling."""
        try:
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(pdf_content)
                temp_path = temp_file.name
            
            result = self.converter.convert(temp_path)
            
            os.unlink(temp_path)
            
            if result and result.document and hasattr(result.document, 'pages'):
                return len(result.document.pages)
            return 1
        except Exception as e:
            print(f"Error counting pages: {e}")
            return 1

    def _get_pdf_pages_text(self, pdf_content: bytes) -> List[str]:
        """Extracts text from each page using Docling - from original bank_parser_py.py"""
        pages_text = []
        print("Converting PDF document to structured format using Docling...")
        try:
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(pdf_content)
                temp_path = temp_file.name
            
            print(f"   -> Using cached Docling converter")
            
            docling_start_time = time.time()
            print(f"   -> Starting PDF conversion")
            conversion_result = self.converter.convert(temp_path)
            docling_end_time = time.time()

            os.unlink(temp_path)

            conversion_duration = docling_end_time - docling_start_time
            print(f"   -> Docling conversion completed in {conversion_duration:.2f} seconds")

            if conversion_result and conversion_result.document:
                document = conversion_result.document
                
                if hasattr(document, 'pages') and document.pages:
                    page_numbers = sorted(document.pages.keys())
                    num_pages = len(page_numbers)
                    print(f"   -> PDF has {num_pages} pages with numbers: {page_numbers}")

                    for i, page_num in enumerate(page_numbers):
                        print(f"   -> Processing page {page_num} ({i + 1}/{num_pages})...")
                        
                        try:
                            page_markdown = document.export_to_markdown(page_no=page_num)
                            print(f"      - Page {page_num} markdown length: {len(page_markdown)} characters")
                            
                            has_table = '|' in page_markdown
                            has_transactions = any(keyword in page_markdown.lower() 
                                                 for keyword in ['debit', 'credit', 'balance', 'transaction'])
                            print(f"      - Contains table structure: {has_table}")
                            print(f"      - Contains transaction keywords: {has_transactions}")
                            
                            lines = page_markdown.split('\n')
                            print(f"      - Total lines: {len(lines)}")
                            
                            if page_markdown.strip():
                                pages_text.append(page_markdown)
                                print(f"      - Page {page_num} text added to collection")
                            else:
                                print(f"      - WARNING: Page {page_num} is empty, skipping")
                                
                        except Exception as e:
                            print(f"      - ERROR extracting page {page_num}: {e}")
                            continue
                
                else:
                    print("   -> ERROR: No pages found in document")
                    return []
            else:
                print("   -> ERROR: Docling conversion failed or returned no document")
                return []
            
            print(f"   -> Text extraction complete. Collected {len(pages_text)} pages")
            return pages_text
            
        except Exception as e:
            print(f"   -> ERROR: Failed to process PDF with Docling: {e}")
            return []

    def _clean_and_load_json(self, response_text: str, page_num: int) -> Dict:
        """Cleans and loads JSON from model response."""
        print(f"      -> Parsing JSON response from AI for page {page_num}...")
        
        try:
            parsed = json.loads(response_text)
            print(f"      -> JSON parsing successful")
            return parsed
        except (json.JSONDecodeError, TypeError) as e:
            print(f"      -> WARNING: Initial JSON parsing failed: {e}")
            
            match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if match:
                cleaned_text = match.group(1)
                try:
                    parsed = json.loads(cleaned_text)
                    print(f"      -> Cleanup successful, JSON parsed")
                    return parsed
                except json.JSONDecodeError:
                    return {"transactions": []}
            else:
                return {"transactions": []}

    async def _process_first_page_async(self, page_text: str) -> Tuple[List[Dict], List[str]]:
        """Processes first page for header detection - from original code."""
        print("   -> Sending page 1 to AI for header detection and data extraction...")
        print(f"   -> Page 1 text length: {len(page_text)} characters")
        
        prompt = f"""
        You are converting bank statement markdown text to JSON. Your job is to preserve the data EXACTLY as it appears in the markdown.

        **CRITICAL RULES:**
        1. Copy all values EXACTLY as they appear - do not modify, interpret, or transform anything
        2. If you see "200.00(Dr)" write "200.00(Dr)" - do not change to "-200.00" or remove "(Dr)"
        3. If you see "1,500.00(Cr)" write "1,500.00(Cr)" - keep it exactly the same
        4. Use the exact column headers from the markdown table
        5. Do not add minus signs or convert Dr/Cr to positive/negative numbers

        **Output format:**
        Return only a JSON object with "transactions" key containing an array of transaction objects.

        **Markdown text:**
        ```
        {page_text}
        ```
        """
        
        try:
            print("   -> Making API call to Gemini...")
            api_start_time = time.time()
            response = await self.model.generate_content_async(prompt)
            api_end_time = time.time()
            
            print(f"   -> API call completed in {api_end_time - api_start_time:.2f} seconds")
            
            parsed_json = self._clean_and_load_json(response.text, page_num=1)
            transactions = parsed_json.get("transactions", [])
            
            print(f"   -> Extracted {len(transactions)} transactions from JSON response")
            
            headers = []
            if transactions:
                headers = list(transactions[0].keys())
                print(f"   -> SUCCESS: Detected {len(headers)} column headers from page 1")
                print(f"   -> Headers found: {headers}")
                        
            else:
                print("   -> WARNING: No transactions found on page 1, cannot determine headers")
            
            return transactions, headers
            
        except Exception as e:
            print(f"   -> ERROR: An exception occurred while processing page 1: {e}")
            return [], []

    async def _process_subsequent_page_async(self, page_text: str, page_num: int, headers: List[str]) -> List[Dict]:
        """Processes subsequent pages using predefined headers."""
        print(f"   -> Processing page {page_num} with predefined headers...")
        print(f"   -> Using headers: {headers}")
        
        prompt = f"""
        You are converting bank statement markdown text to JSON. Your job is to preserve the data EXACTLY as it appears in the markdown.

        **CRITICAL RULES:**
        1. Copy all values EXACTLY as they appear - do not modify, interpret, or transform anything
        2. If you see "200.00(Dr)" write "200.00(Dr)" - do not change to "-200.00" or remove "(Dr)"
        3. If you see "1,500.00(Cr)" write "1,500.00(Cr)" - keep it exactly the same
        4. Use these exact column headers: {json.dumps(headers)}
        5. Do not add minus signs or convert Dr/Cr to positive/negative numbers

        **Output format:**
        Return only a JSON object with "transactions" key containing an array of transaction objects.

        **Markdown text:**
        ```
        {page_text}
        ```
        """
        
        try:
            api_start_time = time.time()
            response = await self.model.generate_content_async(prompt)
            api_end_time = time.time()
            
            print(f"   -> Page {page_num} API call completed in {api_end_time - api_start_time:.2f} seconds")
            
            parsed_json = self._clean_and_load_json(response.text, page_num=page_num)
            transactions = parsed_json.get("transactions", [])
            
            print(f"   -> SUCCESS: Extracted {len(transactions)} transactions from page {page_num}")
                    
            return transactions
            
        except Exception as e:
            print(f"   -> ERROR: An exception occurred while processing page {page_num}: {e}")
            return []

    def _create_standard_format(self, all_transactions: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """Convert to standard API format."""
        account_info = {
            "account_holder": "Account Holder",
            "account_number": "****0000", 
            "bank_name": "Bank",
            "statement_period": {
                "from": "2024-01-01",
                "to": "2024-12-31"
            },
            "opening_balance": 0.0,
            "closing_balance": 0.0
        }
        
        return {
            "account_info": account_info,
            "transactions": all_transactions
        }

    async def parse_bank_statement(self, pdf_content: bytes) -> Dict[str, Any]:
        """Main parsing function adapted from original parse_bank_statement_async."""
        start_time = time.time()
        print("\n" + "="*25 + " STARTING PARSING PROCESS " + "="*25)

        try:
            # Stage 1: Extract text from all pages
            print(f"\n--- STAGE 1: PDF Text Extraction ---")
            pages_text = self._get_pdf_pages_text(pdf_content)
            page_count = len(pages_text)
            
            print(f"\nExtraction Summary:")
            print(f"   -> Total pages extracted: {page_count}")
            
            if page_count == 0:
                raise ValueError("No text could be extracted from the PDF.")
                
            # Stage 2: Process first page for headers
            print(f"\n--- STAGE 2: Header Detection from Page 1 ---")
            first_page_transactions, headers = await self._process_first_page_async(pages_text[0])
            all_transactions = first_page_transactions
            
            print(f"\nFirst Page Processing Summary:")
            print(f"   -> Transactions found: {len(first_page_transactions)}")
            print(f"   -> Headers detected: {len(headers)}")
            print(f"   -> Headers: {headers}")
            
            # Stage 3: Process remaining pages in parallel
            if headers and page_count > 1:
                print(f"\n--- STAGE 3: Processing Remaining {page_count - 1} Pages in Parallel ---")
                remaining_pages_text = pages_text[1:]
                
                tasks = [
                    self._process_subsequent_page_async(text, i + 2, headers) 
                    for i, text in enumerate(remaining_pages_text)
                ]
                
                parallel_start_time = time.time()
                results_from_other_pages = await asyncio.gather(*tasks)
                parallel_end_time = time.time()
                
                print(f"   -> All parallel requests completed in {parallel_end_time - parallel_start_time:.2f} seconds")
                
                print(f"\n--- STAGE 4: Combining All Results ---")
                for i, transaction_list in enumerate(results_from_other_pages):
                    all_transactions.extend(transaction_list)
                    print(f"   -> Added {len(transaction_list)} transactions from page {i + 2}")
                    print(f"   -> Running total: {len(all_transactions)} transactions")
                    
            elif not headers:
                 print(f"\n--- SKIPPING REMAINING PAGES: No headers found on page 1 ---")

            processing_time = time.time() - start_time
            print(f"\n--- FINALIZING ---")
            print(f"   -> Total transactions collected: {len(all_transactions)}")
            print(f"   -> Total processing time: {processing_time:.2f} seconds")
            
            processed_data = self._create_standard_format(all_transactions, headers)
            
            processed_data["metadata"] = {
                "pages_processed": page_count,
                "total_transactions": len(all_transactions),
                "processing_method": "docling",
                "processing_time_seconds": round(processing_time, 2),
                "detected_headers": headers
            }
            
            print("="*70 + "\n")
            return processed_data
            
        except Exception as e:
            processing_time = time.time() - start_time
            raise ValueError(f"Bank statement parsing failed after {processing_time:.2f}s: {str(e)}")

# Lazy initialization with caching
from functools import lru_cache

@lru_cache(maxsize=1)
def get_docling_parser():
    """Get or create the docling parser instance."""
    return DoclingParser()
