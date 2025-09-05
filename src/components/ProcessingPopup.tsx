'use client';

interface ProcessingPopupProps {
  isVisible: boolean;
  progress: number;
  fileName?: string;
  onCancel?: () => void;
  isCancelling?: boolean;
  method?: 'fast' | 'accurate' | 'standard';
  currentPage?: number;
  totalPages?: number;
  sampleTransactions?: any[];
  timePerPage?: number;
}

export default function ProcessingPopup({ 
  isVisible, 
  progress,
  fileName,
  onCancel,
  isCancelling,
  method = 'fast',
  currentPage = 0,
  totalPages = 0,
  sampleTransactions = [],
  timePerPage = 0
}: ProcessingPopupProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-lg shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="relative mb-4">
            <div className="w-16 h-16 bg-[#ff5941]/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto border border-[#ff5941]/20">
              <svg className="w-8 h-8 text-[#ff5941] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            {/* Pulse effect */}
            <div className="absolute inset-0 w-16 h-16 bg-[#ff5941] rounded-full animate-ping opacity-20 mx-auto"></div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Processing Bank Statement
          </h3>
          <p className="text-sm text-gray-600 mb-1">
            {fileName || 'Converting your file...'}
          </p>
          <p className="text-xs text-[#ff5941] font-medium">
            Advanced Table Extraction - {
              method === 'fast' ? 'Fast Mode' : 
              method === 'accurate' ? 'Accurate Mode' : 
              'Standard Mode'
            }
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="h-3 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[#ff5941] to-[#e04527]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Processing Info */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500">
            {isCancelling ? 'Cancelling conversion...' : 'Processing takes approximately 4 seconds per page'}
          </p>
        </div>


        {/* Cancel Button */}
        {onCancel && !isCancelling && (
          <div className="text-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg transition-colors duration-200"
            >
              Cancel Conversion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}