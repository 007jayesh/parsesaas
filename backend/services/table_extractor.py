import pandas as pd
import json
import re
import time
import sys
import io
from typing import Dict, Any, List, Tuple
from datetime import datetime
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode

class TableExtractor:
    def __init__(self):
        pass
    
    def extract_tables_from_pdf(self, pdf_content: bytes, config: str = "fast") -> Dict[str, Any]:
        """Extract tables from PDF using different docling configurations
        
        Args:
            pdf_content: PDF file content as bytes
            config: Configuration mode - "fast" (Config 4), "accurate" (Config 2), or "standard" (Original)
        """
        try:
            from docling.datamodel.document import DocumentStream
            
            start_time = time.time()
            
            if config == "accurate":
                print(f"Starting PDF processing with Config 2: Cell Matching OFF + ACCURATE Mode...")
                config_name = "Config 2: Cell Matching OFF + ACCURATE"
                config_details = {
                    "do_cell_matching": False,
                    "mode": "ACCURATE",
                    "do_ocr": False
                }
                # Config 2: Enhanced pipeline configuration for maximum accuracy
                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = False
                pipeline_options.do_table_structure = True
                pipeline_options.table_structure_options.do_cell_matching = False  # OFF
                pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE  # ACCURATE mode
            elif config == "standard":
                print(f"Starting PDF processing with Standard Configuration (Original)...")
                config_name = "Standard Configuration (Original)"
                config_details = {
                    "do_ocr": False,
                    "do_table_structure": True,
                    "mode": "DEFAULT"
                }
                # Standard: Original pipeline configuration
                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = False
                pipeline_options.do_table_structure = True
            else:
                print(f"Starting PDF processing with Config 4: Cell Matching OFF + FAST Mode...")
                config_name = "Config 4: Cell Matching OFF + FAST"
                config_details = {
                    "do_cell_matching": False,
                    "mode": "FAST",
                    "do_ocr": False
                }
                # Config 4: Enhanced pipeline configuration for speed and accuracy
                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = False
                pipeline_options.do_table_structure = True
                pipeline_options.table_structure_options.do_cell_matching = False  # OFF for better performance
                pipeline_options.table_structure_options.mode = TableFormerMode.FAST  # FAST mode
            
            converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )
            print(f"   -> DocumentConverter initialized with {config_name} options")
            
            # Create a DocumentStream from bytes
            doc_stream = DocumentStream(
                name="input.pdf",
                stream=io.BytesIO(pdf_content)
            )
            
            print(f"   -> Starting PDF conversion")
            result = converter.convert(doc_stream)
            print("   -> PDF processing complete.")
            
            all_tables = {
                "config_name": config_name,
                "config_details": config_details,
                "number_of_tables": len(result.document.tables),
                "tables": [],
                "pages_processed": len(result.document.pages) if hasattr(result.document, 'pages') else 1
            }
            
            print(f"   -> Found {len(result.document.tables)} tables to process")
            
            for table_index, table in enumerate(result.document.tables):
                try:
                    table_df = table.export_to_dataframe()
                    
                    table_info = {
                        "table_number": table_index + 1,
                        "columns": table_df.columns.tolist(),
                        "row_count": len(table_df),
                        "data": table_df.to_dict('records'),
                        "location": {
                            "page": getattr(table, 'page_number', None),
                            "coordinates": getattr(table, 'coordinates', None)
                        }
                    }
                    
                    # Add numerical summary for tables with numeric columns
                    numeric_columns = table_df.select_dtypes(include=['number']).columns
                    if len(numeric_columns) > 0:
                        table_info["numerical_summary"] = table_df[numeric_columns].describe().to_dict()
                        print(f"   -> Added numerical summary for {len(numeric_columns)} numeric columns")
                    
                    all_tables["tables"].append(table_info)
                    print(f"   -> Successfully processed table {table_index + 1}: {len(table_df)} rows, {len(table_df.columns)} columns")
                    
                except Exception as e:
                    print(f"   -> Error converting table {table_index + 1} to DataFrame: {str(e)}")
                    # Enhanced error handling with location info
                    all_tables["tables"].append({
                        "table_number": table_index + 1,
                        "error": str(e),
                        "location": {"page": getattr(table, 'page_number', None) if 'table' in locals() else None}
                    })
                    continue
            
            # Add execution time tracking
            end_time = time.time()
            execution_time = end_time - start_time
            all_tables["execution_time_seconds"] = round(execution_time, 2)
            print(f"   -> PDF processing completed in {execution_time:.2f} seconds")
            
            return all_tables
            
        except Exception as e:
            end_time = time.time()
            execution_time = end_time - start_time if 'start_time' in locals() else 0
            return {
                "error": f"Error processing PDF: {str(e)}",
                "number_of_tables": 0,
                "tables": [],
                "pages_processed": 0,
                "execution_time_seconds": round(execution_time, 2)
            }
    
    def process_tables_sequentially(self, tables_json: Dict[str, Any]) -> Tuple[pd.DataFrame, List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Enhanced sequential processing from bank_parser_py.py with master header detection and split column merging
        """
        print("\n" + "="*50)
        print("--- Enhanced Sequential Table Processing (from bank_parser_py.py) ---")
        print("="*50)
        
        # Step 1: Basic setup and unicode correction
        json_string = json.dumps(tables_json)
        json_string = json_string.replace('/uni', r'\u')
        data = json.loads(json_string)

        if not data.get('tables'):
            print("No tables found in the document.")
            return pd.DataFrame(), [], [], []

        all_processed_dfs = []
        
        # --- Step 2: Handle the First Table ---
        print("\n" + "="*50)
        print("--- 1. Raw JSON of the First Table ---")
        print("="*50)
        first_table = data['tables'][0]
        print(f"First table info: {len(first_table.get('data', []))} rows, columns: {first_table.get('columns', [])}")

        # --- Step 3: Find Master Headers from the First Table ---
        print("\n" + "="*50)
        print("--- 2. Finding Master Headers from First Table ---")
        print("="*50)
        master_headers = None
        if first_table.get('columns') and not all(str(col).isdigit() for col in first_table['columns']):
            master_headers = first_table['columns']
            print(f"✅ Master headers identified: {master_headers}")
        else:
            print("⚠️ ERROR: The first table does not contain valid headers. Cannot proceed.")
            return pd.DataFrame(), [], [], []
        
        # Process the first table's data for final consolidation
        first_df = pd.DataFrame(first_table['data'])
        # Clean NaN values immediately
        first_df = first_df.fillna('')
        all_processed_dfs.append(first_df)

        # --- Step 4: Process and Print Subsequent Tables ---
        print("\n" + "="*50)
        print("--- 3. Processing Subsequent Tables ---")
        print("="*50)
        sample_transactions = []
        table_info = []
        
        for table in data['tables'][1:]:  # Loop starts from the SECOND table
            table_num = table.get('table_number', 'N/A')
            print(f"\n--- Processing Table {table_num} ---")
            
            if not table.get('data'):
                print("No data in this table. Skipping.")
                continue
                
            df = pd.DataFrame(table['data'])
            if df.empty:
                print("Table is empty. Skipping.")
                continue
            
            # Clean NaN values immediately after creating DataFrame
            df = df.fillna('')

            # Handle tables with numeric columns (0, 1, 2...)
            if all(str(col).isdigit() for col in df.columns):
                # Check if first row contains header-like data
                first_row_looks_like_headers = False
                if not df.empty and len(df) > 0:
                    first_row = df.iloc[0]
                    header_keywords = ['date', 'description', 'amount', 'balance', 'transaction', 'credit', 'debit', 'particulars', 'narration', 'details', 'ref', 'cheque', 'check', 'withdrawal', 'deposit']
                    first_row_text = ' '.join(str(val).lower() for val in first_row.values if pd.notna(val))
                    first_row_looks_like_headers = any(keyword in first_row_text for keyword in header_keywords)
                
                if first_row_looks_like_headers:
                    # Use first row as column names and skip it from data
                    new_headers = [str(val).strip() for val in df.iloc[0].values]
                    df = df.iloc[1:].reset_index(drop=True)
                    df.columns = new_headers
                    print(f"✅ Table {table_num}: Used first row as headers - {new_headers}")
                elif len(df.columns) == len(master_headers):
                    # Apply master headers if column count matches
                    df.columns = master_headers
                    df._master_headers_applied = True  # Mark that master headers were applied
                    print(f"✅ Applied master headers to Table {table_num} (keeping all rows)")
                else:
                    # Column count mismatch - create generic column names
                    generic_headers = [f'Column_{i+1}' for i in range(len(df.columns))]
                    df.columns = generic_headers
                    print(f"⚠️ Table {table_num}: Column count mismatch with master headers.")
                    print(f"Expected {len(master_headers)} columns, got {len(df.columns)}")
                    print(f"Using generic column names: {generic_headers}")
            else:
                print(f"✅ Table {table_num}: Already has meaningful column names - {df.columns.tolist()}")
            
            # Handle split column merging (from bank_parser_py.py:116-126)
            if '' in df.columns:
                try:
                    cols = list(df.columns)
                    empty_col_index = cols.index('')
                    if empty_col_index > 0:
                        target_col = cols[empty_col_index - 1]
                        df[target_col] = df[target_col].fillna('').astype(str).str.strip() + ' ' + df[''].fillna('').astype(str).str.strip()
                        df = df.drop(columns=[''])
                        print(f"✅ Merged split column in Table {table_num}")
                except Exception as e:
                    print(f"Warning: Could not merge split column in Table {table_num}. Error: {e}")

            print(f"✅ Processed Table {table_num}: {len(df)} rows")
            all_processed_dfs.append(df)

        # --- Step 5: Display the Final Consolidated DataFrame ---
        print("\n\n" + "#"*60)
        print("### ALL TABLES PROCESSED. FINAL CONSOLIDATED DATAFRAME ###")
        print("#"*60)
        final_df = pd.concat(all_processed_dfs, ignore_index=True)
        # Final cleanup of any remaining NaN values
        final_df = final_df.fillna('')
        print(f"Final DataFrame shape: {final_df.shape}")
        
        # Create sample transactions for API compatibility
        sample_transactions = self._extract_sample_transactions(final_df, max_samples=3)
        
        # Group processed tables by column structure and merge them
        print("\n" + "="*50)
        print("--- 4. Grouping and Merging Tables by Column Structure ---")
        print("="*50)
        
        # Enhanced column similarity matching to merge tables with similar columns
        column_groups = {}
        
        def get_normalized_column_key(columns):
            """Normalize column names for similarity matching"""
            normalized = []
            for col in columns:
                col_lower = str(col).lower().strip()
                # Handle common variations
                if 'value' in col_lower and 'date' in col_lower:
                    normalized.append('value_date')
                elif col_lower == 'value':
                    normalized.append('value_date')  # Treat 'Value' same as 'Value Date'
                else:
                    normalized.append(col_lower.replace(' ', '_'))
            return tuple(normalized)
        
        def columns_are_similar(cols1, cols2):
            """Check if two column sets are similar enough to merge"""
            if len(cols1) != len(cols2):
                return False
            
            norm1 = get_normalized_column_key(cols1)
            norm2 = get_normalized_column_key(cols2)
            
            return norm1 == norm2
        
        for i, df in enumerate(all_processed_dfs):
            current_columns = df.columns.tolist()
            print(f"Table {i + 1} columns: {current_columns}")
            
            # Find if this table can be merged with an existing group
            merged_with_existing = False
            for existing_key, group_data in column_groups.items():
                existing_columns = list(existing_key)
                if columns_are_similar(current_columns, existing_columns):
                    print(f"  -> Similar to existing group with columns: {existing_columns}")
                    print(f"  -> Merging Table {i + 1} with existing group")
                    
                    # Standardize column names to match the first table in the group
                    df_standardized = df.copy()
                    df_standardized.columns = existing_columns
                    
                    group_data.append({
                        'table_number': i + 1,
                        'dataframe': df_standardized
                    })
                    merged_with_existing = True
                    break
            
            if not merged_with_existing:
                # Create new group
                col_key = tuple(current_columns)
                column_groups[col_key] = [{
                    'table_number': i + 1,
                    'dataframe': df
                }]
                print(f"  -> Created new group with columns: {current_columns}")
        
        print(f"\nFound {len(column_groups)} unique column structures after similarity matching:")
        for i, (col_key, tables) in enumerate(column_groups.items()):
            table_numbers = [t['table_number'] for t in tables]
            print(f"Group {i+1}: Columns {list(col_key)} -> Tables {table_numbers}")
        
        # Create merged individual tables for separate sheet generation
        individual_tables = []
        for group_idx, (col_key, tables) in enumerate(column_groups.items()):
            # Merge all tables in this group
            group_dfs = [table['dataframe'] for table in tables]
            merged_df = pd.concat(group_dfs, ignore_index=True)
            
            table_numbers = [table['table_number'] for table in tables]
            # Use sequential numbering starting from 1
            sequential_table_number = group_idx + 1
            
            individual_tables.append({
                'table_number': sequential_table_number,
                'columns': list(col_key),
                'row_count': len(merged_df),
                'data': merged_df.to_dict('records'),
                'merged_from': table_numbers
            })
            
            print(f"✅ Created merged table {sequential_table_number} with {len(merged_df)} rows from tables {table_numbers}")
        
        print(f"\nFinal result: {len(individual_tables)} merged tables for separate sheets")
        
        # Create merged table info to match the individual_tables structure
        table_info = []
        for merged_table in individual_tables:
            table_info.append({
                "table_number": merged_table['table_number'],
                "table_name": f"Transaction Table {merged_table['table_number']}",
                "columns": merged_table['columns'],
                "row_count": merged_table['row_count'],
                "sample_data": merged_table['data'][:3] if merged_table['data'] else [],
                "merged_from": merged_table['merged_from']
            })
        
        return final_df, sample_transactions, table_info, individual_tables
    
    def process_tables_sequentially_original(self, tables_json: Dict[str, Any]) -> Tuple[pd.DataFrame, List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Process tables sequentially, merging tables with identical column structures
        """
        # Fix unicode issues
        json_string = json.dumps(tables_json)
        json_string = json_string.replace('/uni', r'\u')
        data = json.loads(json_string)
        
        if not data.get('tables'):
            return pd.DataFrame(), [], []
        
        # First pass: process all tables and normalize their column structures
        processed_tables = []
        
        for i, table in enumerate(data['tables']):
            if not table.get('data'):
                continue
                
            df = pd.DataFrame(table['data'])
            if df.empty:
                continue
            
            # Determine the correct column headers for this table
            final_columns = None
            
            # SKIP column determination if master headers were already applied
            if hasattr(df, '_master_headers_applied') and df._master_headers_applied:
                final_columns = df.columns.tolist()
                print(f"✅ Table {table_num}: Using previously applied master headers: {final_columns}")
            # Check if columns are already meaningful (not just numeric indexes)
            elif table.get('columns') and not all(str(col).isdigit() for col in table['columns']):
                final_columns = table['columns']
            elif all(str(col).isdigit() for col in df.columns):
                # Check if first row contains header-like data
                first_row_looks_like_headers = False
                if not df.empty and len(df) > 0:
                    first_row = df.iloc[0]
                    header_keywords = ['date', 'description', 'amount', 'balance', 'transaction', 'credit', 'debit', 'particulars', 'narration', 'details', 'ref', 'cheque', 'check']
                    first_row_text = ' '.join(str(val).lower() for val in first_row.values if pd.notna(val))
                    first_row_looks_like_headers = any(keyword in first_row_text for keyword in header_keywords)
                
                if first_row_looks_like_headers:
                    # Use first row as column names and skip it
                    final_columns = [str(val).strip() for val in df.iloc[0].values]
                    df = df.iloc[1:].reset_index(drop=True)
                else:
                    # Create generic column names
                    final_columns = [f'Column_{i+1}' for i in range(len(df.columns))]
            else:
                # Use existing column names
                final_columns = df.columns.tolist()
            
            # Apply the determined column names - ensure length matches
            if len(final_columns) == len(df.columns):
                df.columns = final_columns
            else:
                print(f"Warning: Column count mismatch in table {i+1}. Expected {len(df.columns)}, got {len(final_columns)}. Using generic names.")
                final_columns = [f'Column_{j+1}' for j in range(len(df.columns))]
                df.columns = final_columns
            
            # Handle split column logic
            if '' in df.columns:
                try:
                    cols = list(df.columns)
                    empty_col_index = cols.index('')
                    if empty_col_index > 0:
                        target_col = cols[empty_col_index - 1]
                        df[target_col] = df[target_col].fillna('').astype(str).str.strip() + ' ' + df[''].fillna('').astype(str).str.strip()
                        df = df.drop(columns=[''])
                except Exception as e:
                    print(f"Warning: Could not merge split column in table {i+1}. Error: {e}")
            
            processed_tables.append({
                'original_table_number': table.get('table_number', i + 1),
                'dataframe': df,
                'columns': df.columns.tolist()
            })
        
        # Second pass: group tables by identical column structures
        table_groups = {}  # key: frozenset of columns, value: list of table data
        
        for processed_table in processed_tables:
            columns_key = frozenset(processed_table['columns'])
            
            if columns_key not in table_groups:
                table_groups[columns_key] = {
                    'columns': processed_table['columns'],
                    'dataframes': [],
                    'original_numbers': []
                }
            
            table_groups[columns_key]['dataframes'].append(processed_table['dataframe'])
            table_groups[columns_key]['original_numbers'].append(processed_table['original_table_number'])
        
        # Third pass: create consolidated tables and metadata
        print(f"DEBUG: Found {len(table_groups)} unique column structures")
        for i, (columns_key, group_data) in enumerate(table_groups.items()):
            print(f"DEBUG: Group {i+1}: columns={group_data['columns']}, merged from tables {group_data['original_numbers']}")
        
        all_processed_dfs = []
        sample_transactions = []
        table_info = []
        consolidated_table_number = 1
        
        # CRITICAL FIX: Check if table_groups is empty and use fallback
        if not table_groups:
            print(f"WARNING: No table groups found, using individual processed tables as fallback")
            # Use processed_tables directly as fallback
            for processed_table in processed_tables:
                if not processed_table['dataframe'].empty:
                    all_processed_dfs.append(processed_table['dataframe'])
                    sample_transactions.extend(self._extract_sample_transactions(processed_table['dataframe'], max_samples=3))
                    
                    table_info.append({
                        "table_number": consolidated_table_number,
                        "table_name": f"Table {consolidated_table_number}",
                        "columns": processed_table['columns'],
                        "row_count": len(processed_table['dataframe']),
                        "sample_data": processed_table['dataframe'].head(3).to_dict('records'),
                        "merged_from": [processed_table['original_table_number']]
                    })
                    consolidated_table_number += 1
        else:
            for columns_key, group_data in table_groups.items():
                try:
                    # Merge all dataframes with the same column structure
                    merged_df = pd.concat(group_data['dataframes'], ignore_index=True)
                    if not merged_df.empty:
                        all_processed_dfs.append(merged_df)
                        
                        # Add sample transactions
                        sample_transactions.extend(self._extract_sample_transactions(merged_df, max_samples=3))
                        
                        # Create consolidated table info with user-friendly names
                        if len(group_data['original_numbers']) == 1:
                            # Single table - use friendly numbering
                            table_name = f"Table {consolidated_table_number}"
                        else:
                            # Multiple tables merged - show it's a merged table
                            table_name = f"Table {consolidated_table_number} (Merged)"
                        
                        table_info.append({
                            "table_number": consolidated_table_number,
                            "table_name": table_name,
                            "columns": group_data['columns'],
                            "row_count": len(merged_df),
                            "sample_data": merged_df.head(3).to_dict('records'),
                            "merged_from": group_data['original_numbers']
                        })
                        
                        consolidated_table_number += 1
                    else:
                        print(f"WARNING: Empty dataframe after merging group with columns: {group_data['columns']}")
                except Exception as e:
                    print(f"ERROR: Failed to merge table group with columns {group_data['columns']}: {str(e)}")
                    # Fallback: add individual tables from this group
                    for df in group_data['dataframes']:
                        if not df.empty:
                            all_processed_dfs.append(df)
                            sample_transactions.extend(self._extract_sample_transactions(df, max_samples=3))
        
        # Create individual processed tables for separate sheet generation
        individual_tables = []
        for processed_table in processed_tables:
            # Use the actual column names from the processed DataFrame
            actual_columns = processed_table['dataframe'].columns.tolist()
            individual_tables.append({
                'table_number': processed_table['original_table_number'],
                'columns': actual_columns,  # Use actual processed column names
                'row_count': len(processed_table['dataframe']),
                'data': processed_table['dataframe'].to_dict('records')
            })
            print(f"DEBUG Individual Table {processed_table['original_table_number']}: Using processed columns {actual_columns}")
        
        # Combine all dataframes into final result with robust error handling
        print(f"DEBUG: About to create final_df from {len(all_processed_dfs)} processed dataframes")
        
        if not all_processed_dfs:
            print(f"ERROR: No processed dataframes available! This will cause 'No transactions found' error.")
            print(f"DEBUG: Original processed_tables count: {len(processed_tables)}")
            print(f"DEBUG: Table groups count: {len(table_groups)}")
            
            # Last resort fallback: try to use any non-empty DataFrame from processed_tables
            fallback_dfs = []
            for processed_table in processed_tables:
                if not processed_table['dataframe'].empty:
                    fallback_dfs.append(processed_table['dataframe'])
                    print(f"DEBUG: Added fallback dataframe with {len(processed_table['dataframe'])} rows")
            
            if fallback_dfs:
                print(f"DEBUG: Using {len(fallback_dfs)} fallback dataframes")
                final_df = pd.concat(fallback_dfs, ignore_index=True)
            else:
                print(f"CRITICAL ERROR: No dataframes available at all!")
                final_df = pd.DataFrame()
        else:
            try:
                final_df = pd.concat(all_processed_dfs, ignore_index=True)
                print(f"DEBUG: Successfully created final_df with {len(final_df)} rows from {len(all_processed_dfs)} dataframes")
            except Exception as e:
                print(f"ERROR: Failed to concatenate dataframes: {str(e)}")
                # Fallback: use the first non-empty dataframe
                final_df = next((df for df in all_processed_dfs if not df.empty), pd.DataFrame())
                print(f"DEBUG: Used fallback single dataframe with {len(final_df)} rows")
        
        print(f"FINAL RESULT: final_df has {len(final_df)} rows, {len(final_df.columns) if not final_df.empty else 0} columns")
        
        return final_df, sample_transactions, table_info, individual_tables
    
    def _extract_sample_transactions(self, df: pd.DataFrame, max_samples: int = 3) -> List[Dict[str, Any]]:
        """Extract sample transactions from a dataframe"""
        samples = []
        
        if df.empty:
            return samples
        
        # Try to find date, description, and amount columns
        date_col = self._find_column(df, ['date', 'transaction_date', 'trans_date'])
        desc_col = self._find_column(df, ['description', 'particulars', 'narration', 'details'])
        amount_col = self._find_column(df, ['amount', 'credit', 'debit', 'balance'])
        
        for _, row in df.head(max_samples).iterrows():
            sample = {}
            
            if date_col:
                sample['date'] = str(row[date_col])
            if desc_col:
                sample['description'] = str(row[desc_col])[:50] + ('...' if len(str(row[desc_col])) > 50 else '')
            if amount_col:
                sample['amount'] = str(row[amount_col])
            
            if sample:  # Only add if we found some data
                samples.append(sample)
        
        return samples
    
    def _find_column(self, df: pd.DataFrame, possible_names: List[str]) -> str:
        """Find a column by checking possible names (case insensitive)"""
        df_columns_lower = [col.lower() for col in df.columns]
        
        for name in possible_names:
            for i, col in enumerate(df_columns_lower):
                if name.lower() in col:
                    return df.columns[i]
        
        return None
    
    def convert_to_structured_format(self, df: pd.DataFrame, table_info: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Convert DataFrame to the standard format expected by the frontend"""
        if df.empty:
            return {
                "transactions": [],
                "account_info": {},
                "metadata": {
                    "total_transactions": 0,
                    "processing_method": "table_extraction",
                    "processing_time_seconds": 0
                }
            }
        
        # Convert DataFrame to transaction list
        transactions = []
        for _, row in df.iterrows():
            transaction = {}
            for col in df.columns:
                value = row[col]
                # Clean up the value - handle all possible NaN/null cases
                if pd.isna(value) or value is None or str(value).lower() in ['nan', 'none', 'null']:
                    transaction[col] = ""
                else:
                    transaction[col] = str(value).strip()
            transactions.append(transaction)
        
        return {
            "transactions": transactions,
            "account_info": {
                "processing_method": "Table Extraction Method",
                "total_transactions": len(transactions)
            },
            "metadata": {
                "total_transactions": len(transactions),
                "processing_method": "table_extraction",
                "processing_time_seconds": 0,  # Will be set by the caller
                "detected_headers": df.columns.tolist(),
                "table_info": table_info or []
            }
        }

# Initialize the extractor
table_extractor = TableExtractor()