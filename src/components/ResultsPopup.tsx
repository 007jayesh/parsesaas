'use client';
// Enhanced UI version
import { useState } from 'react';

interface Transaction {
  [key: string]: any;
}

interface ResultsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  creditsUsed: number;
  fileName: string;
  onDownload: (format: string) => void;
  isDownloading: boolean;
}

export default function ResultsPopup({ 
  isOpen, 
  onClose, 
  transactions, 
  creditsUsed, 
  fileName, 
  onDownload,
  isDownloading 
}: ResultsPopupProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  if (!isOpen) return null;

  console.log("DEBUG ResultsPopup: transactions received:", transactions);
  console.log("DEBUG ResultsPopup: transactions length:", transactions?.length);

  const handleDownload = (format: string) => {
    setSelectedFormat(format);
    onDownload(format);
  };

  // Get column headers from first transaction
  const headers = transactions.length > 0 ? Object.keys(transactions[0]) : [];
  
  // Show only first 10 transactions in preview
  const previewTransactions = transactions.slice(0, 10);

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gradient-to-br from-black/40 to-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white/98 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-6xl w-full min-h-fit max-h-[calc(100vh-4rem)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <span>Processing Complete</span>
                <div className="animate-bounce">🎉</div>
              </h2>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                <span className="inline-flex items-center space-x-2">
                  <span className="truncate max-w-xs" title={fileName}>{fileName}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-green-600 font-semibold">{transactions.length} transactions</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-blue-600 font-semibold">{creditsUsed} credits used</span>
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full p-2 transition-all duration-200 hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {/* Download Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Download Your Data
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleDownload('csv')}
                disabled={isDownloading && selectedFormat === 'csv'}
                className="group relative overflow-hidden flex items-center justify-center px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-red-400 disabled:to-orange-400 text-white rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-semibold">
                  {isDownloading && selectedFormat === 'csv' ? 'Downloading...' : 'CSV Format'}
                </span>
              </button>
              
              <button
                onClick={() => handleDownload('excel')}
                disabled={isDownloading && selectedFormat === 'excel'}
                className="group relative overflow-hidden flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-green-400 disabled:to-emerald-400 text-white rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a4 4 0 01-4 4z" />
                </svg>
                <span className="font-semibold">
                  {isDownloading && selectedFormat === 'excel' ? 'Downloading...' : 'Excel Format'}
                </span>
              </button>
              
              <button
                onClick={() => handleDownload('json')}
                disabled={isDownloading && selectedFormat === 'json'}
                className="group relative overflow-hidden flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-purple-400 disabled:to-indigo-400 text-white rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="font-semibold">
                  {isDownloading && selectedFormat === 'json' ? 'Downloading...' : 'JSON Format'}
                </span>
              </button>
            </div>
          </div>

          {/* Data Preview */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Data Preview
                </h3>
                {transactions.length > 10 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Showing first 10 of {transactions.length} transactions
                  </p>
                )}
              </div>
            </div>
            
            {transactions.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        {headers.map((header, index) => (
                          <th
                            key={header}
                            className={`px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider ${
                              index === 0 ? 'rounded-tl-xl' : ''
                            } ${index === headers.length - 1 ? 'rounded-tr-xl' : ''}`}
                          >
                            <div className="flex items-center space-x-2">
                              <span>{header}</span>
                              <div className="w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {previewTransactions.map((transaction, index) => (
                        <tr key={index} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                          {headers.map((header, headerIndex) => (
                            <td
                              key={`${index}-${header}`}
                              className="px-6 py-4 text-sm text-gray-900"
                            >
                              <div className="flex items-center space-x-2">
                                {headerIndex === 0 && (
                                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                                )}
                                <span className="truncate max-w-xs" title={transaction[header] || '-'}>
                                  {transaction[header] || '-'}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 py-12">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-500">No transactions found</p>
                </div>
              </div>
            )}
          </div>

          {/* Credits Info & Stats */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-800">
                    Processing Complete!
                  </p>
                  <p className="text-sm text-green-700 font-medium">
                    Successfully extracted {transactions.length} transactions using {creditsUsed} credits
                  </p>
                </div>
              </div>
              <div className="flex space-x-4 text-right">
                <div className="bg-white/50 rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-green-600">{transactions.length}</p>
                  <p className="text-xs text-green-700 font-medium">Transactions</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">{creditsUsed}</p>
                  <p className="text-xs text-blue-700 font-medium">Credits Used</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Processing time:</span> Less than a minute ⚡
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 transform hover:scale-105 shadow-sm"
          >
            <span className="flex items-center space-x-2">
              <span>Close</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}