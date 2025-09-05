'use client';
// Complete Enhanced UI - Professional & Creative
import { useState, useEffect } from 'react';
import FeedbackPopup from './FeedbackPopup';

interface TableInfo {
  table_number: number;
  columns: string[];
  row_count: number;
  sample_data: any[];
}

interface EnhancedResultsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
  creditsUsed: number;
  fileName: string;
  onDownload: (format: string, tableSelection?: any) => void;
  isDownloading: boolean;
  tableInfo?: TableInfo[];
  processingMethod?: string;
}

export default function EnhancedResultsPopup({
  isOpen,
  onClose,
  transactions,
  creditsUsed,
  fileName,
  onDownload,
  isDownloading,
  tableInfo = [],
  processingMethod = 'method1'
}: EnhancedResultsPopupProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [outputMode, setOutputMode] = useState<'combined' | 'separate'>('separate');
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);

  // Set default tab to "Transaction Table 1" when component opens or tableInfo changes
  useEffect(() => {
    if (isOpen && tableInfo.length > 0) {
      const transactionTable1Index = tableInfo.findIndex(table => 
        table.table_name === "Transaction Table 1" || 
        (table.table_name && table.table_name.includes("Transaction") && table.table_name.includes("1"))
      );
      setActiveTab(transactionTable1Index !== -1 ? transactionTable1Index : 0);
    }
  }, [isOpen, tableInfo]);

  if (!isOpen) return null;

  // Debug logging
  console.log('EnhancedResultsPopup - tableInfo:', tableInfo);
  console.log('EnhancedResultsPopup - tableInfo length:', tableInfo.length);

  const hasMultipleTables = tableInfo.length > 1;

  const handleTableSelection = (tableNumber: number) => {
    setSelectedTables(prev => 
      prev.includes(tableNumber) 
        ? prev.filter(t => t !== tableNumber)
        : [...prev, tableNumber]
    );
  };

  const handleSelectAll = () => {
    if (selectedTables.length === tableInfo.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tableInfo.map(t => t.table_number));
    }
  };

  const handleDownload = (format: string) => {
    const downloadConfig = {
      selectedTables: selectedTables.length > 0 ? selectedTables : tableInfo.map(t => t.table_number),
      outputMode,
      tableInfo
    };
    onDownload(format, downloadConfig);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gradient-to-br from-black/40 to-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white/98 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 my-4">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Processing Complete
                </h2>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  <span className="inline-flex items-center space-x-2">
                    <span className="truncate max-w-xs" title={fileName}>{fileName}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-blue-600 font-semibold">{creditsUsed} credits used</span>
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFeedbackPopup(true)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9 8a9.014 9.014 0 01-5.436-1.834L3 20l1.834-3.564A9.014 9.014 0 013 12c0-4.418 4.418-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Issue, Feedback or Question</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full p-2 transition-all duration-200 hover:scale-105"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {/* Enhanced Multiple Tables Detection Alert */}
          {hasMultipleTables && (
            <div className="p-6 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-b border-orange-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="text-xl font-bold text-orange-900">Multiple Tables Detected!</h4>
                    <div className="px-3 py-1 bg-orange-200 text-orange-800 text-sm font-semibold rounded-full">
                      {tableInfo.length} Tables
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4 border border-orange-200 mb-4">
                    <p className="text-base font-medium text-orange-900 mb-2">
                      We found <span className="text-orange-600 font-bold text-lg">{tableInfo.length} tables</span> with different column structures.
                    </p>
                    <p className="text-sm text-orange-800">
                      Choose how you want to export the data below:
                    </p>
                  </div>
                  
                  {/* Output Mode Selection */}
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="outputMode"
                        value="separate"
                        checked={outputMode === 'separate'}
                        onChange={(e) => setOutputMode(e.target.value as 'separate')}
                        className="mr-2 text-blue-600"
                      />
                      <span className="text-sm text-blue-900">Separate sheets for each table (Recommended)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="outputMode"
                        value="combined"
                        checked={outputMode === 'combined'}
                        onChange={(e) => setOutputMode(e.target.value as 'combined')}
                        className="mr-2 text-blue-600"
                      />
                      <span className="text-sm text-blue-900">Combine all tables into one sheet</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Table Selection */}
          {hasMultipleTables && (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0h2m-6 0v6a2 2 0 002 2h6a2 2 0 002-2v-6M7 7h10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">Table Selection</h3>
                  <p className="text-sm text-gray-600">Choose which tables to include in your export</p>
                </div>
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white/70 hover:bg-white/90 border border-blue-200 rounded-lg transition-colors"
                >
                  {selectedTables.length === tableInfo.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {tableInfo.map((table) => (
                  <label key={table.table_number} className={`flex items-center cursor-pointer p-3 border rounded-lg transition-all duration-200 ${selectedTables.includes(table.table_number) 
                    ? 'border-blue-300 bg-blue-50/50 shadow-sm' 
                    : 'border-gray-200 bg-white/70 hover:border-gray-300 hover:bg-white/90'
                  }`}>
                    <div className="relative flex items-center justify-center w-4 h-4 mr-3">
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.table_number)}
                        onChange={() => handleTableSelection(table.table_number)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 transition-all duration-200 ${selectedTables.includes(table.table_number) 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300 bg-white'
                      }`}>
                        {selectedTables.includes(table.table_number) && (
                          <svg className="w-3 h-3 text-white absolute top-0 left-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-gray-900 text-sm truncate">{table.table_name || `Table ${table.table_number}`}</div>
                        <div className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded flex-shrink-0">
                          #{table.table_number}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                        <span>{table.row_count} rows</span>
                        <span>{table.columns.length} cols</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              {selectedTables.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">
                      {selectedTables.length} table{selectedTables.length !== 1 ? 's' : ''} selected for export
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Tabs for Table Preview */}
          {hasMultipleTables && (
            <div className="bg-white border-b border-gray-200">
              <div className="px-6 py-2">
                <div className="flex overflow-x-auto space-x-1">
                  {tableInfo.map((table, index) => (
                    <button
                      key={table.table_number}
                      onClick={() => setActiveTab(index)}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 ${
                        activeTab === index
                          ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activeTab === index ? 'bg-blue-500' : 'bg-gray-400'
                        }`}></div>
                        <span>{table.table_name || `Table ${table.table_number}`}</span>
                        <span className="text-xs opacity-75">({table.row_count} rows)</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Table Preview - Enhanced DataFrame Style */}
          <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {hasMultipleTables 
                    ? `${tableInfo[activeTab]?.table_name || `Table ${tableInfo[activeTab]?.table_number}`}` 
                    : "Transaction Data Preview"
                  }
                </h3>
                <p className="text-sm text-gray-500">
                  {hasMultipleTables 
                    ? `${tableInfo[activeTab]?.row_count} rows × ${tableInfo[activeTab]?.columns.length} columns`
                    : `${transactions.length} rows × ${transactions.length > 0 ? Object.keys(transactions[0]).length : 0} columns`
                  }
                </p>
              </div>
            </div>

            {hasMultipleTables ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 bg-slate-100 sticky left-0">
                          #
                        </th>
                        {tableInfo[activeTab]?.columns.map((col, index) => (
                          <th key={index} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[120px]">
                            <div className="flex items-center space-x-2">
                              <span>{col}</span>
                              <div className="w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {tableInfo[activeTab]?.sample_data.slice(0, 8).map((row, index) => (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'} hover:bg-blue-50/50 transition-colors border-b border-gray-100`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-500 border-r border-gray-200 bg-slate-50 sticky left-0">
                            {index + 1}
                          </td>
                          {tableInfo[activeTab]?.columns.map((col, colIndex) => (
                            <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 max-w-[200px]">
                              <div className="flex items-center space-x-2">
                                <span className="truncate" title={String(row[col] || '')}>
                                  {String(row[col] || '-')}
                                </span>
                                {String(row[col] || '').length > 30 && (
                                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="Truncated"></div>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex justify-between items-center">
                  <span>Showing {Math.min(8, tableInfo[activeTab]?.sample_data.length || 0)} of {tableInfo[activeTab]?.row_count} rows</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>DataFrame Preview</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 bg-slate-100 sticky left-0">
                          #
                        </th>
                        {transactions.length > 0 && Object.keys(transactions[0]).map((col, index) => (
                          <th key={index} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[120px]">
                            <div className="flex items-center space-x-2">
                              <span>{col}</span>
                              <div className="w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {transactions.slice(0, 8).map((row, index) => (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'} hover:bg-blue-50/50 transition-colors border-b border-gray-100`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-500 border-r border-gray-200 bg-slate-50 sticky left-0">
                            {index + 1}
                          </td>
                          {Object.values(row).map((val, colIndex) => (
                            <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 max-w-[200px]">
                              <div className="flex items-center space-x-2">
                                <span className="truncate" title={String(val || '')}>
                                  {String(val || '-')}
                                </span>
                                {String(val || '').length > 30 && (
                                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="Truncated"></div>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex justify-between items-center">
                  <span>Showing {Math.min(8, transactions.length)} of {transactions.length} rows</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>DataFrame Preview</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Enhanced Download Options */}
        <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-gray-100 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Export Your Data
              </h3>
              <p className="text-sm text-gray-600">
                {hasMultipleTables && selectedTables.length === 0 
                  ? 'Please select at least one table above to enable downloads'
                  : 'Choose your preferred format and download instantly'
                }
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <button
              onClick={() => handleDownload('csv')}
              disabled={isDownloading || (hasMultipleTables && selectedTables.length === 0)}
              className="group relative overflow-hidden flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:scale-100 min-w-0"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {isDownloading ? (
                <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="font-semibold">CSV Format</span>
            </button>

            <button
              onClick={() => handleDownload('excel')}
              disabled={isDownloading || (hasMultipleTables && selectedTables.length === 0)}
              className="group relative overflow-hidden flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:scale-100 min-w-0"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {isDownloading ? (
                <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a4 4 0 01-4 4z" />
                </svg>
              )}
              <span className="font-semibold">Excel Format</span>
            </button>

            <button
              onClick={() => handleDownload('json')}
              disabled={isDownloading || (hasMultipleTables && selectedTables.length === 0)}
              className="group relative overflow-hidden flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:scale-100 min-w-0"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {isDownloading ? (
                <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              )}
              <span className="font-semibold">JSON Format</span>
            </button>
          </div>

          {/* Statistics Bar */}
          <div className="mt-6 p-4 bg-white/50 rounded-lg border border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">{creditsUsed} Credits Used</span>
              </div>
              {hasMultipleTables && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">{tableInfo.length} Tables Detected</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Processing complete ✓
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Popup */}
      <FeedbackPopup 
        isOpen={showFeedbackPopup}
        onClose={() => setShowFeedbackPopup(false)}
        fileName={fileName}
      />
    </div>
  );
}