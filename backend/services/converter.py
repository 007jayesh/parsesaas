import pandas as pd
import json
import io
from typing import Dict, Any, Tuple
from datetime import datetime

class DataConverter:
    def __init__(self):
        pass
    
    def to_csv(self, parsed_data: Dict[str, Any]) -> str:
        """Convert parsed data to CSV format"""
        print(f"🔍 CONVERTER DEBUG: Starting to_csv conversion")
        print(f"🔍 CONVERTER DEBUG: parsed_data keys: {list(parsed_data.keys())}")
        print(f"🔍 CONVERTER DEBUG: parsed_data type: {type(parsed_data)}")
        
        transactions = parsed_data.get("transactions", [])
        account_info = parsed_data.get("account_info", {})
        
        print(f"🔍 CONVERTER DEBUG: transactions type: {type(transactions)}")
        print(f"🔍 CONVERTER DEBUG: transactions length: {len(transactions) if transactions else 'None/Empty'}")
        
        if not transactions:
            print(f"❌ CONVERTER ERROR: No transactions found!")
            print(f"❌ CONVERTER ERROR: parsed_data content: {parsed_data}")
            raise ValueError("No transactions found to convert")
        
        # Create DataFrame
        df = pd.DataFrame(transactions)
        
        # Add account info as header comments
        csv_output = io.StringIO()
        
        # Write account information as comments
        csv_output.write(f"# Account Holder: {account_info.get('account_holder', 'N/A')}\n")
        csv_output.write(f"# Account Number: {account_info.get('account_number', 'N/A')}\n")
        csv_output.write(f"# Bank: {account_info.get('bank_name', 'N/A')}\n")
        csv_output.write(f"# Statement Period: {account_info.get('statement_period', {}).get('from', 'N/A')} to {account_info.get('statement_period', {}).get('to', 'N/A')}\n")
        csv_output.write(f"# Opening Balance: {account_info.get('opening_balance', 'N/A')}\n")
        csv_output.write(f"# Closing Balance: {account_info.get('closing_balance', 'N/A')}\n")
        csv_output.write(f"# Generated: {datetime.now().isoformat()}\n")
        csv_output.write("\n")
        
        # Write transaction data
        df.to_csv(csv_output, index=False)
        
        return csv_output.getvalue()
    
    def to_excel(self, parsed_data: Dict[str, Any]) -> bytes:
        """Convert parsed data to Excel format"""
        print(f"🔍 CONVERTER DEBUG: Starting to_excel conversion")
        print(f"🔍 CONVERTER DEBUG: parsed_data keys: {list(parsed_data.keys())}")
        
        transactions = parsed_data.get("transactions", [])
        account_info = parsed_data.get("account_info", {})
        
        print(f"🔍 CONVERTER DEBUG: Excel - transactions length: {len(transactions) if transactions else 'None/Empty'}")
        
        if not transactions:
            print(f"❌ CONVERTER ERROR: Excel - No transactions found!")
            print(f"❌ CONVERTER ERROR: Excel - parsed_data content: {parsed_data}")
            raise ValueError("No transactions found to convert")
        
        try:
            # Create Excel file in memory
            excel_buffer = io.BytesIO()
            
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                # Create transactions sheet
                df_transactions = pd.DataFrame(transactions)
                
                # Clean up any problematic values in the dataframe
                df_transactions = df_transactions.fillna('')  # Replace NaN with empty string
                
                # Convert all columns to string and clean Unicode issues
                for col in df_transactions.columns:
                    df_transactions[col] = df_transactions[col].astype(str)
                    # Clean Unicode escape sequences that might cause Excel issues
                    df_transactions[col] = df_transactions[col].str.replace(r'/uni[0-9a-fA-F]{4}', '', regex=True)
                    # Replace any other problematic characters
                    df_transactions[col] = df_transactions[col].str.encode('ascii', errors='ignore').str.decode('ascii')
                
                df_transactions.to_excel(writer, sheet_name='Transactions', index=False)
                
                # Create account info sheet
                account_data = []
                for key, value in account_info.items():
                    if key == 'statement_period' and isinstance(value, dict):
                        account_data.append(['Statement From', str(value.get('from', 'N/A'))])
                        account_data.append(['Statement To', str(value.get('to', 'N/A'))])
                    else:
                        account_data.append([str(key.replace('_', ' ').title()), str(value)])
                
                if account_data:  # Only create sheet if there's data
                    df_account = pd.DataFrame(account_data, columns=['Field', 'Value'])
                    df_account.to_excel(writer, sheet_name='Account Info', index=False)
                
                # Add metadata sheet
                metadata = parsed_data.get("metadata", {})
                metadata_data = [
                    ['Generated', str(datetime.now().isoformat())],
                    ['Total Transactions', str(len(transactions))],
                    ['Pages Processed', str(metadata.get('pages_processed', 'N/A'))]
                ]
                df_metadata = pd.DataFrame(metadata_data, columns=['Field', 'Value'])
                df_metadata.to_excel(writer, sheet_name='Metadata', index=False)
            
            # Get the Excel bytes
            excel_buffer.seek(0)
            excel_bytes = excel_buffer.read()
            
            # Validate that we have a valid Excel file
            if len(excel_bytes) == 0:
                raise ValueError("Generated Excel file is empty")
            
            # Check if it starts with the Excel file signature
            if not excel_bytes.startswith(b'PK'):
                raise ValueError("Generated file does not appear to be a valid Excel file")
            
            print(f"Generated Excel file: {len(excel_bytes)} bytes")
            return excel_bytes
            
        except Exception as e:
            print(f"Error generating Excel file: {str(e)}")
            raise ValueError(f"Failed to generate Excel file: {str(e)}")
    
    def to_json(self, parsed_data: Dict[str, Any]) -> str:
        """Convert parsed data to formatted JSON"""
        # Add generation timestamp
        output_data = parsed_data.copy()
        output_data["generated_at"] = datetime.now().isoformat()
        
        return json.dumps(output_data, indent=2, ensure_ascii=False)
    
    def convert_to_formats(self, parsed_data: Dict[str, Any], formats: list) -> Dict[str, Any]:
        """Convert data to multiple formats"""
        results = {}
        
        for fmt in formats:
            if fmt.lower() == 'csv':
                results['csv'] = self.to_csv(parsed_data)
            elif fmt.lower() == 'excel':
                results['excel'] = self.to_excel(parsed_data)
            elif fmt.lower() == 'json':
                results['json'] = self.to_json(parsed_data)
        
        return results
    
    def filter_data_by_tables(self, parsed_data: Dict[str, Any], selected_tables: list, table_info: list, output_mode: str) -> Dict[str, Any]:
        """Filter parsed data to include only selected tables"""
        transactions = parsed_data.get("transactions", [])
        
        if not selected_tables or not table_info:
            return parsed_data
        
        # For now, since we merge tables in processing, we'll return all data
        # In a more sophisticated implementation, we would track which transactions
        # came from which original tables
        return parsed_data
    
    def to_excel_with_config(self, parsed_data: Dict[str, Any], table_info: list, selected_tables: list, output_mode: str) -> bytes:
        """Convert parsed data to Excel with table configuration"""
        transactions = parsed_data.get("transactions", [])
        account_info = parsed_data.get("account_info", {})
        raw_tables = parsed_data.get("metadata", {}).get("raw_tables", [])
        
        if not transactions:
            raise ValueError("No transactions found to convert")
        
        try:
            excel_buffer = io.BytesIO()
            
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                if output_mode == 'separate' and table_info and len(table_info) > 1:
                    # Create separate sheets for each table using original table data
                    print(f"Creating separate sheets for {len(table_info)} tables")
                    
                    # Get table info for selected tables
                    selected_table_info = [t for t in table_info if t['table_number'] in selected_tables] if selected_tables else table_info
                    
                    # If processed table data is available, use it for separation
                    if raw_tables:
                        print(f"Using processed individual table data with {len(raw_tables)} tables")
                        print(f"First table columns: {raw_tables[0].get('columns', []) if raw_tables else 'None'}")
                        if len(raw_tables) > 1:
                            print(f"Second table columns: {raw_tables[1].get('columns', [])}")
                        for table in selected_table_info:
                            table_num = table['table_number']
                            # Find the corresponding raw table
                            raw_table = next((t for t in raw_tables if t['table_number'] == table_num), None)
                            
                            if raw_table and 'data' in raw_table:
                                # Use the processed table data with proper column names
                                df = pd.DataFrame(raw_table['data'])
                                if not df.empty:
                                    # Apply the correct column names from processed table
                                    if 'columns' in raw_table and raw_table['columns']:
                                        df.columns = [str(col) for col in raw_table['columns']]
                                        print(f"Applied processed column names: {raw_table['columns']}")
                                    else:
                                        # Fallback: ensure column names are strings
                                        df.columns = [str(col) for col in df.columns]
                                    # Clean up the dataframe
                                    df = df.fillna('')
                                    for col in df.columns:
                                        df[col] = df[col].astype(str)
                                        df[col] = df[col].str.replace(r'/uni[0-9a-fA-F]{4}', '', regex=True)
                                        df[col] = df[col].str.encode('ascii', errors='ignore').str.decode('ascii')
                                    
                                    sheet_name = f"Table_{table_num}"
                                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                                    print(f"Created sheet: {sheet_name} with {len(df)} rows from original table data")
                            else:
                                # Fallback to using all merged transactions
                                df = pd.DataFrame(transactions)
                                if not df.empty:
                                    df = df.fillna('')
                                    # Ensure column names are strings
                                    df.columns = [str(col) for col in df.columns]
                                    for col in df.columns:
                                        df[col] = df[col].astype(str)
                                        df[col] = df[col].str.replace(r'/uni[0-9a-fA-F]{4}', '', regex=True)
                                        df[col] = df[col].str.encode('ascii', errors='ignore').str.decode('ascii')
                                    
                                    sheet_name = f"Table_{table_num}"
                                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                                    print(f"Created fallback sheet: {sheet_name} with {len(df)} rows (merged data)")
                    else:
                        # Fallback to merged transaction data
                        print("No raw table data available, using merged transactions")
                        for table in selected_table_info:
                            df = pd.DataFrame(transactions)
                            if not df.empty:
                                df = df.fillna('')
                                # Ensure column names are strings
                                df.columns = [str(col) for col in df.columns]
                                for col in df.columns:
                                    df[col] = df[col].astype(str)
                                    df[col] = df[col].str.replace(r'/uni[0-9a-fA-F]{4}', '', regex=True)
                                    df[col] = df[col].str.encode('ascii', errors='ignore').str.decode('ascii')
                                
                                sheet_name = f"Table_{table['table_number']}"
                                df.to_excel(writer, sheet_name=sheet_name, index=False)
                                print(f"Created fallback sheet: {sheet_name} with {len(df)} rows")
                else:
                    # Combined mode - single sheet with all data
                    print("Creating combined sheet with all data")
                    df = pd.DataFrame(transactions)
                    df = df.fillna('')
                    # Ensure column names are strings
                    df.columns = [str(col) for col in df.columns]
                    for col in df.columns:
                        df[col] = df[col].astype(str)
                        df[col] = df[col].str.replace(r'/uni[0-9a-fA-F]{4}', '', regex=True)
                        df[col] = df[col].str.encode('ascii', errors='ignore').str.decode('ascii')
                    
                    df.to_excel(writer, sheet_name='All_Transactions', index=False)
                
                # Add account info sheet
                account_data = []
                for key, value in account_info.items():
                    if key == 'statement_period' and isinstance(value, dict):
                        account_data.append(['Statement From', str(value.get('from', 'N/A'))])
                        account_data.append(['Statement To', str(value.get('to', 'N/A'))])
                    else:
                        account_data.append([str(key.replace('_', ' ').title()), str(value)])
                
                if account_data:
                    df_account = pd.DataFrame(account_data, columns=['Field', 'Value'])
                    df_account.to_excel(writer, sheet_name='Account_Info', index=False)
                
                # Add table metadata sheet
                if table_info:
                    table_metadata = []
                    for table in table_info:
                        table_metadata.append([
                            f"Table {table['table_number']}",
                            f"{table['row_count']} rows",
                            ", ".join([str(col) for col in table['columns']])
                        ])
                    
                    df_metadata = pd.DataFrame(table_metadata, columns=['Table', 'Row Count', 'Columns'])
                    df_metadata.to_excel(writer, sheet_name='Table_Info', index=False)
            
            excel_buffer.seek(0)
            excel_bytes = excel_buffer.read()
            
            if len(excel_bytes) == 0:
                raise ValueError("Generated Excel file is empty")
            
            if not excel_bytes.startswith(b'PK'):
                raise ValueError("Generated file does not appear to be a valid Excel file")
            
            print(f"Generated configured Excel file: {len(excel_bytes)} bytes")
            return excel_bytes
            
        except Exception as e:
            print(f"Error generating configured Excel file: {str(e)}")
            raise ValueError(f"Failed to generate configured Excel file: {str(e)}")

# Initialize converter
converter = DataConverter()