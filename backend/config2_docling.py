from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode
import json
import time

def extract_tables_config_2(pdf_path):
    """
    Config 2: Cell Matching OFF + ACCURATE Mode
    Most reliable configuration for complex tables
    """
    start_time = time.time()
    
    # Pipeline options - Config 2
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False
    pipeline_options.do_table_structure = True
    pipeline_options.table_structure_options.do_cell_matching = False  # OFF
    pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE  # ACCURATE
    
    # Initialize converter
    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    
    # Convert PDF
    result = converter.convert(pdf_path)
    
    # Build results
    all_tables = {
        "config_name": "Config 2: Cell Matching OFF + ACCURATE",
        "config_details": {
            "do_cell_matching": False,
            "mode": "ACCURATE",
            "do_ocr": False
        },
        "number_of_tables": len(result.document.tables),
        "tables": []
    }
    
    # Process tables
    for table_index, table in enumerate(result.document.tables):
        try:
            table_df = table.export_to_dataframe()
            
            table_info = {
                "table_number": table_index + 1,
                "columns": list(table_df.columns),
                "row_count": len(table_df),
                "data": table_df.to_dict('records'),
                "location": {
                    "page": getattr(table, 'page_number', None),
                    "coordinates": getattr(table, 'coordinates', None)
                }
            }
            
            # Add numerical summary
            numeric_columns = table_df.select_dtypes(include=['number']).columns
            if len(numeric_columns) > 0:
                table_info["numerical_summary"] = table_df[numeric_columns].describe().to_dict()
            
            all_tables["tables"].append(table_info)
            
        except Exception as e:
            all_tables["tables"].append({
                "table_number": table_index + 1,
                "error": str(e),
                "location": {"page": getattr(table, 'page_number', None) if 'table' in locals() else None}
            })
    
    end_time = time.time()
    execution_time = end_time - start_time
    all_tables["execution_time_seconds"] = round(execution_time, 2)
    
    return all_tables

# Main execution
if __name__ == "__main__":
    pdf_path = '/Users/jayeshyadav/Downloads/untitled folder/167705737_1741453090249.pdf'
    
    print("Running Config 2: Cell Matching OFF + ACCURATE...")
    results = extract_tables_config_2(pdf_path)
    
    print(f"✅ Completed in {results['execution_time_seconds']} seconds")
    print(f"📊 Extracted {results['number_of_tables']} tables")
    print("\n" + "="*50)
    print("JSON RESULTS:")
    print("="*50)
    print(json.dumps(results, indent=2, ensure_ascii=False, default=str))