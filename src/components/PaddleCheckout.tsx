'use client';

import React, { useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface PaddleCheckoutProps {
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}

interface CreditPackage {
  credits: number;
  price_amount: string;
  price_display: string;
  description: string;
  currency: string;
}

interface Packages {
  [key: string]: CreditPackage;
}

const PaddleCheckout: React.FC<PaddleCheckoutProps> = ({ onSuccess, onClose }) => {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [packages, setPackages] = useState<Packages>({});
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('professional');

  useEffect(() => {
    // Initialize Paddle
    const initPaddle = async () => {
      try {
        // Replace with your Paddle Client Token from Paddle Dashboard
        const paddleInstance = await initializePaddle({
          environment: 'sandbox', // Change to 'production' for live
          token: 'your_paddle_client_token_here' // Get this from Paddle Dashboard
        });
        setPaddle(paddleInstance);
      } catch (error) {
        console.error('Failed to initialize Paddle:', error);
      }
    };

    initPaddle();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('http://localhost:8000/paddle/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      const data = await response.json();
      if (data && data.packages) {
        setPackages(data.packages);
      } else {
        // Set default packages if API fails
        setPackages({
          starter: {
            credits: 100,
            price_amount: '9.99',
            price_display: '$9.99',
            description: 'Perfect for small businesses',
            currency: 'USD'
          },
          professional: {
            credits: 500,
            price_amount: '39.99',
            price_display: '$39.99',
            description: 'Best for growing teams',
            currency: 'USD'
          },
          enterprise: {
            credits: 1500,
            price_amount: '99.99',
            price_display: '$99.99',
            description: 'For large scale operations',
            currency: 'USD'
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      // Set default packages if API fails
      setPackages({
        starter: {
          credits: 100,
          price_amount: '9.99',
          price_display: '$9.99',
          description: 'Perfect for small businesses',
          currency: 'USD'
        },
        professional: {
          credits: 500,
          price_amount: '39.99',
          price_display: '$39.99',
          description: 'Best for growing teams',
          currency: 'USD'
        },
        enterprise: {
          credits: 1500,
          price_amount: '99.99',
          price_display: '$99.99',
          description: 'For large scale operations',
          currency: 'USD'
        }
      });
    }
  };

  const handlePurchase = async () => {
    if (!paddle || !selectedPackage) return;

    setLoading(true);
    try {
      // Create transaction on backend
      const response = await fetch('http://localhost:8000/paddle/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          package_id: selectedPackage,
          success_url: `${window.location.origin}/payment-success`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const { checkout_url } = await response.json();

      // Redirect to Paddle Checkout
      window.location.href = checkout_url;

    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Buy Credits</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {Object.entries(packages || {}).map(([packageId, pkg]) => (
            <div
              key={packageId}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedPackage === packageId
                  ? 'border-[#ff5941] bg-[#ff5941] bg-opacity-5'
                  : 'border-gray-200 hover:border-[#ff5941]'
              }`}
              onClick={() => setSelectedPackage(packageId)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">{packageId}</h3>
                  <p className="text-sm text-gray-600">{pkg.description}</p>
                  <p className="text-lg font-bold text-[#ff5941]">{pkg.credits} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{pkg.price_display}</p>
                  <p className="text-sm text-gray-500">
                    ${(parseFloat(pkg.price_amount) / 100 / pkg.credits).toFixed(3)} per credit
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading || !selectedPackage}
            className="flex-1 bg-[#ff5941] text-white px-4 py-2 rounded-md hover:bg-[#e04527] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Secure payment powered by Paddle
          </p>
          <div className="flex justify-center items-center mt-2 space-x-2 text-xs text-gray-400">
            <span>🔒 SSL Secured</span>
            <span>•</span>
            <span>💳 All major cards</span>
            <span>•</span>
            <span>🌍 Global payments</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaddleCheckout;