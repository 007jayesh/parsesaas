'use client';

import Link from 'next/link';

interface SignupPromptPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignupPromptPopup({ isOpen, onClose }: SignupPromptPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-black/80 backdrop-blur-xl border border-blue-500/30 rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-blue-500/20 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            🚀 Sign Up Required
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Welcome Bonus Highlight */}
          <div className="bg-green-900/20 backdrop-blur-md border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-lg font-semibold text-green-300 mb-1">
                  Get 10 Free Credits!
                </p>
                <p className="text-sm text-green-400">
                  Sign up now and convert 10 pages absolutely free
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-300 mb-4">
              You need an account to convert bank statements. Create your free account in seconds and start converting immediately!
            </p>
            
            <div className="flex items-center justify-center text-sm text-gray-400 mb-4">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              100% secure • No data stored • Instant processing
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-6">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                10 Free Credits
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Instant Processing
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                Multiple Formats
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                Bank Support
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/signup"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center block"
            >
              🎉 Create Free Account & Get 10 Credits
            </Link>
            
            <Link
              href="/login"
              className="w-full bg-black/30 backdrop-blur-md border border-blue-500/30 hover:bg-black/50 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-center block"
            >
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}