'use client';

import { useState, useEffect } from 'react';

interface ProcessingStats {
  currentStage: string;
  headersDetected: number;
  processingTime: number;
  currentExtraction: string;
  geminiTransactions: string[];
  showingGeminiData: boolean;
  terminalLogs: string[];
  progress?: number;
  totalStages?: number;
  currentStageIndex?: number;
  error?: string;
  canCancel?: boolean;
}

interface ProcessingModalProps {
  isVisible: boolean;
  processingStats: ProcessingStats;
  selectedFile?: File | null;
  onCancel?: () => void;
}

const PROCESSING_STAGES = [
  { key: 'upload', label: 'Upload', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )},
  { key: 'extract', label: 'Extract', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
  { key: 'analyze', label: 'Process', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )},
  { key: 'generate', label: 'Convert', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { key: 'complete', label: 'Complete', icon: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )}
];

export default function ProcessingModal({ 
  isVisible, 
  processingStats, 
  selectedFile,
  onCancel 
}: ProcessingModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Animate content changes
  useEffect(() => {
    setPulseKey(prev => prev + 1);
  }, [processingStats.currentExtraction]);

  // Determine current stage index based on stage text
  const getCurrentStageIndex = () => {
    const stage = processingStats.currentStage.toLowerCase();
    if (stage.includes('upload')) return 0;
    if (stage.includes('convert') || stage.includes('extract')) return 1;
    if (stage.includes('process') || stage.includes('analyz')) return 2;
    if (stage.includes('generat') || stage.includes('creating')) return 3;
    if (stage.includes('complete')) return 4;
    return processingStats.currentStageIndex || 0;
  };

  const currentStageIndex = getCurrentStageIndex();
  const progress = processingStats.progress || ((currentStageIndex + 1) / PROCESSING_STAGES.length) * 100;
  const isError = processingStats.error || processingStats.currentStage.includes('❌');

  if (!isVisible && !isClosing) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
      isClosing ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className={`relative bg-black/80 backdrop-blur-md border border-blue-500/30 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto transform transition-all duration-300 ${
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!isError ? (
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-900/50 backdrop-blur-md rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  {/* Pulse effect */}
                  <div className="absolute inset-0 w-12 h-12 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                </div>
              ) : (
                <div className="w-12 h-12 bg-red-900/50 backdrop-blur-md rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.664 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isError ? 'Processing Failed' : 'Processing Bank Statement'}
                </h3>
                <p className="text-sm text-gray-300 mt-1">
                  {selectedFile?.name} • {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
            </div>
            
            {/* Cancel button */}
            {onCancel && processingStats.canCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-200 transition-colors p-2"
                title="Cancel processing"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-700 ease-out ${
                  isError ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="px-8 py-4 bg-black/50 backdrop-blur-md border-b border-blue-500/20">
          <div className="flex items-center justify-between">
            {PROCESSING_STAGES.map((stage, index) => (
              <div key={stage.key} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300 ${
                  index < currentStageIndex 
                    ? 'bg-green-500 text-white' 
                    : index === currentStageIndex && !isError
                    ? 'bg-blue-500 text-white animate-pulse'
                    : index === currentStageIndex && isError
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {index < currentStageIndex || (index === currentStageIndex && processingStats.currentStage.includes('✅')) ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stage.icon
                  )}
                </div>
                {index < PROCESSING_STAGES.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 transition-colors duration-300 ${
                    index < currentStageIndex ? 'bg-green-500' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            {PROCESSING_STAGES.map((stage, index) => (
              <div key={`label-${stage.key}`} className="flex items-center">
                <span className={`text-xs font-medium ${
                  index === currentStageIndex ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {stage.label}
                </span>
                {index < PROCESSING_STAGES.length - 1 && (
                  <div className="w-12 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-80 overflow-y-auto">

          {/* Live Extraction Preview */}
          {processingStats.currentExtraction && !isError && (
            <div key={pulseKey} className="mb-4 animate-fadeIn">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Live Processing Output</h4>
              <div className="bg-gray-950 text-green-400 rounded-lg p-4 font-mono text-sm">
                <div className="opacity-70 text-gray-400 mb-2 text-xs">EXTRACTING FROM PDF:</div>
                <div className="text-green-400 whitespace-pre-wrap leading-relaxed">
                  {processingStats.currentExtraction}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {isError && processingStats.error && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-red-400 mb-2">Error Details</h4>
              <div className="bg-red-900/20 backdrop-blur-md border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm">{processingStats.error}</p>
              </div>
            </div>
          )}

          {/* Extracted Transactions */}
          {processingStats.showingGeminiData && processingStats.geminiTransactions.length > 0 && (
            <div className="mb-4 animate-fadeIn">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Extracted Transactions</h4>
              <div className="bg-blue-900/20 backdrop-blur-md border border-blue-500/30 rounded-lg p-4 max-h-32 overflow-y-auto">
                <div className="space-y-2">
                  {processingStats.geminiTransactions.map((transaction, index) => (
                    <div 
                      key={`${transaction}-${index}`}
                      className="text-sm text-gray-300 font-mono bg-black/30 backdrop-blur-md rounded p-2 border border-blue-500/20"
                    >
                      {transaction}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Processing Stats */}
          {processingStats.headersDetected > 0 && (
            <div className="text-sm">
              <div className="bg-green-900/20 backdrop-blur-md border border-green-500/30 rounded-lg p-3">
                <div className="font-medium text-green-300">Data Columns</div>
                <div className="text-green-400">{processingStats.headersDetected} detected</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-blue-500/20 bg-black/50 backdrop-blur-md rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {isError 
                ? 'Processing failed. Please try again.'
                : processingStats.showingGeminiData 
                ? 'Data extraction completed successfully!' 
                : 'Your file is being processed securely and will not be stored...'}
            </div>
            
            {isError && onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}