import io
import json
import time
import os
import asyncio
import re
from typing import Dict, Any, List, Tuple
import nest_asyncio
nest_asyncio.apply()

# You must install these libraries:
# pip install pandas google-generativeai docling docling-core
import pandas as pd
import google.generativeai as genai
from docling.document_converter import DocumentConverter

# ==============================================================================
# 1. THE PARSER CLASS
# ==============================================================================
class VerboseParser:
    """
    Parses a PDF bank statement with detailed step-by-step logging.
    Uses Docling for PDF-to-text conversion and a two-stage parallel process:
    1. Determines headers from the first page.
    2. Extracts data from all other pages in parallel using those headers.
    """
    def __init__(self, api_key: str = None):
        self.method_name = "Verbose Two-Stage Parallel (Docling)"
        
        effective_api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not effective_api_key:
            raise ValueError("Gemini API key not found. Pass it to the constructor or set the GEMINI_API_KEY environment variable.")
            
        genai.configure(api_key=effective_api_key)
        
        self.model = genai.GenerativeModel(
            'gemini-2.5-flash-lite',
            generation_config=genai.types.GenerationConfig(
                temperature=0.0, # 0.0 for maximum consistency
                response_mime_type="application/json",
            )
        )
        print("Parser initialized successfully.")

    def _get_pdf_pages_text(self, pdf_file_path: str) -> List[str]:
        """
        Extracts text from each page using Docling with detailed step-by-step output.
        """
        pages_text = []
        print("Converting PDF document to structured format using Docling...")
        try:
            # Initialize Docling converter
            converter = DocumentConverter()
            print(f"   -> Docling converter initialized")
            
            # Convert PDF
            docling_start_time = time.time()
            print(f"   -> Starting PDF conversion: {pdf_file_path}")
            conversion_result = converter.convert(pdf_file_path)
            docling_end_time = time.time()

            conversion_duration = docling_end_time - docling_start_time
            print(f"   -> Docling conversion completed in {conversion_duration:.2f} seconds")

            if conversion_result and conversion_result.document:
                document = conversion_result.document
                
                # Check if document has pages
                if hasattr(document, 'pages') and document.pages:
                    page_numbers = sorted(document.pages.keys())
                    num_pages = len(page_numbers)
                    print(f"   -> PDF has {num_pages} pages with numbers: {page_numbers}")

                    # Extract content from each page
                    for i, page_num in enumerate(page_numbers):
                        print(f"\n   -> Processing page {page_num} ({i + 1}/{num_pages})...")
                        
                        try:
                            # Export page to markdown
                            page_markdown = document.export_to_markdown(page_no=page_num)
                            print(f"      - Page {page_num} markdown length: {len(page_markdown)} characters")
                            
                            # Check content type
                            has_table = '|' in page_markdown
                            has_transactions = any(keyword in page_markdown.lower() 
                                                 for keyword in ['debit', 'credit', 'balance', 'transaction'])
                            print(f"      - Contains table structure: {has_table}")
                            print(f"      - Contains transaction keywords: {has_transactions}")
                            
                            # Print first few lines for verification
                            lines = page_markdown.split('\n')
                            print(f"      - Total lines: {len(lines)}")
                            print(f"      - First 3 lines preview:")
                            for j, line in enumerate(lines[:3]):
                                print(f"        Line {j+1}: {line[:80]}{'...' if len(line) > 80 else ''}")
                            
                            # Print full page content
                            print(f"\n      === FULL PAGE {page_num} CONTENT ===")
                            print(page_markdown)
                            print(f"      === END PAGE {page_num} CONTENT ===\n")
                            
                            # Store page text
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
        """Cleans and loads the JSON from the model's response with detailed output."""
        print(f"      -> Parsing JSON response from AI for page {page_num}...")
        print(f"      -> Response length: {len(response_text)} characters")
        print(f"      -> Raw response preview: {response_text[:200]}...")
        
        try:
            parsed = json.loads(response_text)
            print(f"      -> JSON parsing successful")
            return parsed
        except (json.JSONDecodeError, TypeError) as e:
            print(f"      -> WARNING: Initial JSON parsing failed: {e}")
            print(f"      -> Attempting to clean and re-parse...")
            
            match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if match:
                cleaned_text = match.group(1)
                print(f"      -> Found JSON block, length: {len(cleaned_text)} characters")
                try:
                    parsed = json.loads(cleaned_text)
                    print(f"      -> Cleanup successful, JSON parsed")
                    return parsed
                except json.JSONDecodeError as e2:
                    print(f"      -> ERROR: Fallback JSON parsing also failed: {e2}")
                    return {"transactions": []}
            else:
                print(f"      -> ERROR: No valid JSON block found after cleanup")
                return {"transactions": []}

    async def _process_first_page_async(self, page_text: str) -> Tuple[List[Dict], List[str]]:
        """Processes the first page to extract transactions AND identify column headers with detailed output."""
        print("   -> Sending page 1 to AI for header detection and data extraction...")
        print(f"   -> Page 1 text length: {len(page_text)} characters")
        print(f"   -> Page 1 preview (first 300 chars): {page_text[:300]}...")
        
        prompt = f"""
        You are an AI data analyst. Your first task is to analyze the text of this bank statement page to identify the transaction table and its column headers. Then, extract all transactions from this page.

        **Output Instructions:**
        * The final output **must be only a single, valid JSON object** containing a single key, "transactions", which holds a list of transaction objects.
        * **CRITICAL:** The keys for each transaction object **must be the exact column headers detected from the source text.** Do not change, standardize, simplify, or rename them in any way.
        * Monetary values should be extracted as `numbers` if possible, removing any currency symbols or commas.
        * Ensure that any double quotes (") inside string values are properly escaped with a backslash (e.g., `\\"`).

        **Text to process:**
        ```text
        {page_text}
        ```
        """
        
        try:
            print("   -> Making API call to Gemini...")
            api_start_time = time.time()
            response = await self.model.generate_content_async(prompt)
            api_end_time = time.time()
            
            print(f"   -> API call completed in {api_end_time - api_start_time:.2f} seconds")
            print(f"   -> Response received, processing...")
            
            parsed_json = self._clean_and_load_json(response.text, page_num=1)
            transactions = parsed_json.get("transactions", [])
            
            print(f"   -> Extracted {len(transactions)} transactions from JSON response")
            
            headers = []
            if transactions:
                headers = list(transactions[0].keys())
                print(f"   -> SUCCESS: Detected {len(headers)} column headers from page 1")
                print(f"   -> Headers found: {headers}")
                print(f"   -> Sample transaction keys: {list(transactions[0].keys()) if transactions else 'None'}")
                
                # Print first transaction as example
                if transactions:
                    print(f"   -> First transaction example:")
                    for key, value in transactions[0].items():
                        print(f"      - {key}: {value}")
                        
            else:
                print("   -> WARNING: No transactions found on page 1, cannot determine headers")
                print("   -> This may indicate the first page contains only header information")
            
            return transactions, headers
            
        except Exception as e:
            print(f"   -> ERROR: An exception occurred while processing page 1: {e}")
            return [], []

    async def _process_subsequent_page_async(self, page_text: str, page_num: int, headers: List[str]) -> List[Dict]:
        """Processes a subsequent page using predefined column headers with detailed output."""
        print(f"   -> Processing page {page_num} with predefined headers...")
        print(f"   -> Page {page_num} text length: {len(page_text)} characters")
        print(f"   -> Using headers: {headers}")
        print(f"   -> Page {page_num} preview (first 200 chars): {page_text[:200]}...")
        
        prompt = f"""
        You are an AI data analyst. Extract transaction data from the text of this bank statement page using the provided column headers.

        **Column Headers to Use (in order):**
        {json.dumps(headers)}

        **Output Instructions:**
        * The final output **must be only a single, valid JSON object** containing a single key, "transactions", which holds a list of transaction objects.
        * **CRITICAL:** You **must** use the provided headers as the keys for each transaction object. Do not change them.
        * Monetary values should be extracted as `numbers` if possible, removing any currency symbols or commas.
        * Ensure that any double quotes (") inside string values are properly escaped with a backslash (e.g., `\\"`).

        **Text to process:**
        ```text
        {page_text}
        ```
        """
        
        try:
            print(f"   -> Making API call to Gemini for page {page_num}...")
            api_start_time = time.time()
            response = await self.model.generate_content_async(prompt)
            api_end_time = time.time()
            
            print(f"   -> Page {page_num} API call completed in {api_end_time - api_start_time:.2f} seconds")
            
            parsed_json = self._clean_and_load_json(response.text, page_num=page_num)
            transactions = parsed_json.get("transactions", [])
            
            print(f"   -> SUCCESS: Extracted {len(transactions)} transactions from page {page_num}")
            
            if transactions:
                print(f"   -> Sample transaction from page {page_num}:")
                for key, value in list(transactions[0].items())[:3]:  # Show first 3 fields
                    print(f"      - {key}: {value}")
                if len(transactions[0]) > 3:
                    print(f"      - ... and {len(transactions[0]) - 3} more fields")
                    
            return transactions
            
        except Exception as e:
            print(f"   -> ERROR: An exception occurred while processing page {page_num}: {e}")
            return []

    async def parse_bank_statement_async(self, pdf_file_path: str) -> Dict[str, Any]:
        start_time = time.time()
        print("\n" + "="*25 + " STARTING PARSING PROCESS " + "="*25)
        print(f"Processing file: {pdf_file_path}")

        # Stage 1: Extract text from all pages
        print(f"\n--- STAGE 1: PDF Text Extraction ---")
        pages_text = self._get_pdf_pages_text(pdf_file_path)
        page_count = len(pages_text)
        
        print(f"\nExtraction Summary:")
        print(f"   -> Total pages extracted: {page_count}")
        for i, page_text in enumerate(pages_text):
            print(f"   -> Page {i+1}: {len(page_text)} characters")
        
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
            
            print(f"   -> Creating {len(remaining_pages_text)} parallel tasks...")
            tasks = [
                self._process_subsequent_page_async(text, i + 2, headers) 
                for i, text in enumerate(remaining_pages_text)
            ]
            
            print(f"   -> Executing parallel API calls...")
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

        # Final processing
        processing_time = time.time() - start_time
        print(f"\n--- FINALIZING ---")
        print(f"   -> Total transactions collected: {len(all_transactions)}")
        print(f"   -> Total processing time: {processing_time:.2f} seconds")
        print(f"   -> Average time per page: {processing_time/page_count:.2f} seconds")
        
        # Create metadata
        metadata = {
            "pages_processed": page_count,
            "total_transactions": len(all_transactions),
            "processing_method": self.method_name,
            "processing_time_seconds": round(processing_time, 2),
            "detected_headers": headers
        }
        
        print(f"\n--- METADATA SUMMARY ---")
        for key, value in metadata.items():
            print(f"   -> {key}: {value}")
        
        print("="*70 + "\n")
        return {"transactions": all_transactions, "metadata": metadata}

# ==============================================================================
# 2. HELPER AND MAIN EXECUTION FUNCTIONS
# ==============================================================================

def print_results(result: Dict[str, Any]):
    """Pretty-prints the final extracted data and metadata with detailed output."""
    metadata = result.get("metadata", {})
    transactions = result.get("transactions", [])

    print("" + "="*25 + " FINAL RESULTS " + "="*25 + "")
    
    print(f"\n--- PROCESSING METADATA ---")
    print(f"  Method:           {metadata.get('processing_method', 'N/A')}")
    print(f"  Time Taken:       {metadata.get('processing_time_seconds', 'N/A')} seconds")
    print(f"  Pages Processed:  {metadata.get('pages_processed', 'N/A')}")
    print(f"  Transactions:     {metadata.get('total_transactions', 'N/A')}")
    print(f"  Detected Headers: {metadata.get('detected_headers', 'N/A')}")
    
    print(f"\n--- TRANSACTION ANALYSIS ---")
    if not transactions:
        print("  No transactions were extracted.")
    else:
        print(f"  Total transactions: {len(transactions)}")
        print(f"  Transaction fields: {list(transactions[0].keys()) if transactions else 'None'}")
        
        # Show sample transactions
        print(f"\n--- SAMPLE TRANSACTIONS ---")
        sample_count = min(3, len(transactions))
        for i in range(sample_count):
            print(f"  Transaction {i+1}:")
            for key, value in transactions[i].items():
                print(f"    {key}: {value}")
            print()
    
    print(f"\n--- TRANSACTIONS DATAFRAME ---")
    if not transactions:
        print("  No transactions to display in DataFrame.")
    else:
        try:
            df = pd.DataFrame(transactions)
            print(f"  DataFrame shape: {df.shape}")
            print(f"  DataFrame columns: {list(df.columns)}")
            
            if metadata.get('detected_headers'):
                valid_headers = [h for h in metadata['detected_headers'] if h in df.columns]
                df = df[valid_headers]
                print(f"  Reordered by detected headers: {valid_headers}")
            
            print(f"\n  Full DataFrame:")
            print(df.to_string())
            
        except Exception as e:
            print(f"  Could not display DataFrame. Error: {e}")
            print(f"  Raw transactions list (first 5):")
            for i, trans in enumerate(transactions[:5]):
                print(f"    {i+1}: {trans}")
            if len(transactions) > 5:
                print(f"    ... and {len(transactions) - 5} more transactions")
            
    print("\n" + "="*65)

async def main(pdf_file_path: str, api_key: str):
    """
    Main function to run the parser, process the PDF, and return a DataFrame.
    """
    df = pd.DataFrame() 

    print("=" * 50)
    print("DOCLING PDF BANK STATEMENT PARSER")
    print("=" * 50)
    
    # Validation
    print(f"\n--- INITIAL VALIDATION ---")
    if not api_key or "YOUR_API_KEY" in api_key:
        print("ERROR: Please set your GEMINI_API_KEY in the script.")
        return df
    else:
        print(f"API Key: Provided (length: {len(api_key)} characters)")
        
    if not os.path.exists(pdf_file_path):
        print(f"ERROR: File not found at '{pdf_file_path}'. Please check the path.")
        return df
    else:
        file_size = os.path.getsize(pdf_file_path)
        print(f"PDF File: Found at {pdf_file_path}")
        print(f"File Size: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")

    try:
        # Initialize parser
        print(f"\n--- PARSER INITIALIZATION ---")
        parser = VerboseParser(api_key=api_key)
        print(f"Parser created successfully")
            
        # Process PDF
        print(f"\n--- STARTING PDF PROCESSING ---")
        result = await parser.parse_bank_statement_async(pdf_file_path)
        
        # Print results
        print(f"\n--- DISPLAYING RESULTS ---")
        print_results(result)
        
        # Create DataFrame
        print(f"\n--- CREATING DATAFRAME ---")
        transactions = result.get("transactions", [])
        df = pd.DataFrame(transactions)

        if not df.empty:
            print(f"DataFrame 'df' created successfully with shape: {df.shape}")
            print(f"DataFrame columns: {list(df.columns)}")
            print(f"DataFrame memory usage: {df.memory_usage(deep=True).sum():,} bytes")
        else:
            print("DataFrame 'df' is empty as no transactions were extracted.")
            
        return df

    except Exception as e:
        print(f"\nERROR: An unrecoverable error occurred during the process: {e}")
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        return df

# ==============================================================================
# 3. CONFIGURATION AND EXECUTION
# ==============================================================================

if __name__ == "__main__":
    # Set your Gemini API key here or in environment
    GEMINI_API_KEY = "AIzaSyAa-JU1zhp5dQh9vUhPGKc11ObyPxuDvNo"
    # or use environment variable: GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # Path to your PDF file
    PDF_FILE_PATH = '/Users/jayeshyadav/Downloads/Bank Statement Example Final.pdf'

    # Run the async main function
    async def run():
        df = await main(pdf_file_path=PDF_FILE_PATH, api_key=GEMINI_API_KEY)
        return df

    # Execute the async function
    df = asyncio.run(run())
    
    # Display final result
    print(f"\nScript execution completed!")
    print(f"Final DataFrame shape: {df.shape}")
    if not df.empty:
        print(f"Columns: {list(df.columns)}")
        print("\nFirst few rows:")
        print(df.head())
    else:
        print("No data was extracted.")