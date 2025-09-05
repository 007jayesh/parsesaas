import pandas as pd
import json
import time
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

def extract_tables_from_pdf(pdf_path):
    """
    Extracts all table data from a given PDF file using the docling library.
    """
    try:
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False
        pipeline_options.do_table_structure = True
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        print(f"Starting PDF processing for: {pdf_path}...")
        result = converter.convert(pdf_path)
        print("PDF processing complete.")
        all_tables = {
            "number_of_tables": len(result.document.tables),
            "tables": []
        }
        for table_index, table in enumerate(result.document.tables):
            try:
                table_df = table.export_to_dataframe()
                table_info = {
                    "table_number": table_index + 1,
                    "columns": table_df.columns.tolist(),
                    "row_count": len(table_df),
                    "data": table_df.to_dict('records'),
                }
                all_tables["tables"].append(table_info)
            except Exception as e:
                print(f"Error converting table {table_index + 1} to DataFrame: {str(e)}")
                continue
        return all_tables
    except Exception as e:
        return {
            "error": f"Error during PDF processing: {str(e)}",
            "number_of_tables": 0,
            "tables": []
        }

def process_and_print_sequentially(tables_json):
    """
    Processes tables sequentially, printing the JSON for each step, and
    returns a final consolidated DataFrame.
    """
    # Step 1: Basic setup and unicode correction
    json_string = json.dumps(tables_json)
    json_string = json_string.replace('/uni', r'\u')
    data = json.loads(json_string)

    if not data.get('tables'):
        print("No tables found in the document.")
        return pd.DataFrame()

    all_processed_dfs = []
    
    # --- Step 2: Handle the First Table ---
    print("\n" + "="*50)
    print("--- 1. Raw JSON of the First Table ---")
    print("="*50)
    first_table = data['tables'][0]
    print(json.dumps(first_table, indent=2))

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
        return pd.DataFrame()
    
    # Process the first table's data for final consolidation
    first_df = pd.DataFrame(first_table['data'])
    all_processed_dfs.append(first_df)

    # --- Step 4: Process and Print Subsequent Tables ---
    print("\n" + "="*50)
    print("--- 3. Processing Subsequent Tables ---")
    print("="*50)
    for table in data['tables'][1:]: # Loop starts from the SECOND table
        table_num = table.get('table_number', 'N/A')
        print(f"\n--- Processing Table {table_num} ---")
        
        if not table.get('data'):
            print("No data in this table. Skipping.")
            continue
            
        df = pd.DataFrame(table['data'])
        if df.empty:
            print("Table is empty. Skipping.")
            continue

        # Apply master headers
        if all(str(col).isdigit() for col in df.columns):
            df = df.iloc[1:].reset_index(drop=True)
            if len(df.columns) == len(master_headers):
                df.columns = master_headers
            else:
                print(f"⚠️ SKIPPING Table {table_num}: Mismatched column count.")
                print("Raw JSON for skipped table:")
                print(json.dumps(table, indent=2))
                continue
        
        if '' in df.columns:
            try:
                cols = list(df.columns)
                empty_col_index = cols.index('')
                if empty_col_index > 0:
                    target_col = cols[empty_col_index - 1]
                    df[target_col] = df[target_col].fillna('').astype(str).str.strip() + ' ' + df[''].fillna('').astype(str).str.strip()
                    df = df.drop(columns=[''])
            except Exception as e:
                print(f"Warning: Could not merge split column in Table {table_num}. Error: {e}")

        # Create and print the processed JSON for this table
        processed_table_json = {
            "table_number": table_num, "columns": df.columns.tolist(),
            "row_count": len(df), "data": df.to_dict('records')
        }
        print(f"✅ Processed JSON for Table {table_num}:")
        print(json.dumps(processed_table_json, indent=2))
        all_processed_dfs.append(df)

    # --- Step 5: Display the Final Consolidated DataFrame ---
    print("\n\n" + "#"*60)
    print("### ALL TABLES PROCESSED. FINAL CONSOLIDATED DATAFRAME ###")
    print("#"*60)
    final_df = pd.concat(all_processed_dfs, ignore_index=True)
    display(final_df)
    
    return final_df

# ==============================================================================
# --- MAIN EXECUTION BLOCK ---
# ==============================================================================

# Start the timer
start_time = time.time()

# --- IMPORTANT: CHANGE THIS TO THE PATH OF YOUR PDF FILE ---
pdf_path = '/Users/jayeshyadav/Downloads/untitled folder/670593719-Bank-of-America-Statement.pdf'

# 1. Extract all table data from the PDF
raw_tables_data = extract_tables_from_pdf(pdf_path)

# 2. Run the sequential processing if extraction was successful
if 'error' not in raw_tables_data:
    final_dataframe = process_and_print_sequentially(raw_tables_data)
else:
    print(f"\n❌ PROCESSING FAILED: {raw_tables_data['error']}")

# Stop the timer and print the total duration
end_time = time.time()
duration = end_time - start_time
print("\n" + "*"*60)
print(f"✅ Total process completed in {duration:.2f} seconds.")
print("*"*60)