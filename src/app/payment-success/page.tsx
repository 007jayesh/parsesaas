'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PaymentSuccessPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get transaction ID from URL parameters
        const transactionId = searchParams.get('_ptxn') || searchParams.get('transaction_id');
        
        if (!transactionId) {
          setError('No transaction ID found');
          setLoading(false);
          return;
        }

        // Verify payment with backend
        const response = await fetch(`/api/paddle/transaction/${transactionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPaymentData(data);
        } else {
          setError('Failed to verify payment');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setError('Error verifying payment');
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  if (loading) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
        <div className=\"text-center\">
          <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5941] mx-auto\"></div>
          <p className=\"mt-4 text-gray-600\">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
        <div className=\"bg-white p-8 rounded-lg shadow-sm max-w-md w-full mx-4 text-center\">
          <div className=\"w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4\">
            <svg className=\"w-8 h-8 text-red-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" />
            </svg>
          </div>
          <h1 className=\"text-2xl font-bold text-gray-900 mb-2\">Payment Verification Failed</h1>
          <p className=\"text-gray-600 mb-6\">{error}</p>
          <Link
            href=\"/\"
            className=\"bg-[#ff5941] text-white px-6 py-2 rounded-md hover:bg-[#e04527] transition-colors\"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const localRecord = paymentData?.local_record;
  const credits = localRecord?.credits || 0;

  return (
    <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
      <div className=\"bg-white p-8 rounded-lg shadow-sm max-w-md w-full mx-4 text-center\">
        {/* Success Icon */}
        <div className=\"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4\">
          <svg className=\"w-8 h-8 text-green-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className=\"text-2xl font-bold text-gray-900 mb-2\">Payment Successful!</h1>
        <p className=\"text-gray-600 mb-6\">
          Thank you for your purchase. Your credits have been added to your account.
        </p>

        {/* Payment Details */}
        <div className=\"bg-gray-50 rounded-lg p-4 mb-6\">
          <div className=\"flex justify-between items-center mb-2\">
            <span className=\"text-gray-600\">Credits Added:</span>
            <span className=\"font-bold text-[#ff5941]\">{credits} credits</span>
          </div>
          <div className=\"flex justify-between items-center mb-2\">
            <span className=\"text-gray-600\">Package:</span>
            <span className=\"font-medium capitalize\">{localRecord?.package_id}</span>
          </div>
          <div className=\"flex justify-between items-center\">
            <span className=\"text-gray-600\">Amount:</span>
            <span className=\"font-medium\">
              ${(localRecord?.amount_cents / 100).toFixed(2)} {localRecord?.currency}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className=\"space-y-3\">
          <Link
            href=\"/\"
            className=\"block w-full bg-[#ff5941] text-white px-6 py-3 rounded-md hover:bg-[#e04527] transition-colors font-medium\"
          >
            Start Processing Documents
          </Link>
          <Link
            href=\"/dashboard\"
            className=\"block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors\"
          >
            View Dashboard
          </Link>
        </div>

        {/* Additional Info */}
        <div className=\"mt-6 text-center\">
          <p className=\"text-xs text-gray-500\">
            Receipt has been sent to your email address.
          </p>
          <p className=\"text-xs text-gray-500 mt-1\">
            Need help? <a href=\"mailto:support@thebankstatementparser.com\" className=\"text-[#ff5941] hover:underline\">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;