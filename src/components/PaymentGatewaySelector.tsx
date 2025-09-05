'use client';

import React, { useState, useEffect } from 'react';
import PaddleCheckout from './PaddleCheckout';
import RazorpayCheckout from './RazorpayCheckout';

interface PaymentGatewaySelectorProps {
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}

const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({ onSuccess, onClose }) => {
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [userLocation, setUserLocation] = useState<string>('');
  const [showGatewaySelection, setShowGatewaySelection] = useState(true);

  useEffect(() => {
    // Detect user location (you can use a more sophisticated geolocation service)
    detectUserLocation();
  }, []);

  const detectUserLocation = async () => {
    try {
      // Option 1: Using IP-based geolocation API
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const countryCode = data.country_code;
      
      setUserLocation(countryCode);
      
      // Auto-select gateway based on location
      // Temporarily default to Paddle until Razorpay is activated
      if (countryCode === 'IN') {
        // setSelectedGateway('razorpay'); // Commented out until Razorpay is activated
        setSelectedGateway('paddle'); // Temporary fallback
      } else {
        setSelectedGateway('paddle');
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      // Default to showing both options
      setSelectedGateway('');
    }
  };

  const handleGatewaySelection = (gateway: string) => {
    setSelectedGateway(gateway);
    setShowGatewaySelection(false);
  };

  const handleBackToSelection = () => {
    setShowGatewaySelection(true);
    setSelectedGateway('');
  };

  // If gateway is selected and we're not showing selection, render the checkout
  if (selectedGateway && !showGatewaySelection) {
    if (selectedGateway === 'paddle') {
      return <PaddleCheckout onSuccess={onSuccess} onClose={onClose} />;
    } else if (selectedGateway === 'razorpay') {
      return <RazorpayCheckout onSuccess={onSuccess} onClose={onClose} />;
    }
  }

  // Show gateway selection modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Choose Payment Method</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {userLocation && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Detected location:</span> {userLocation === 'IN' ? '🇮🇳 India' : '🌍 International'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              We've pre-selected the best payment option for your location
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Razorpay Option - Temporarily Disabled */}
          <div
            className={`border rounded-lg p-6 transition-all bg-gray-100 border-gray-300 opacity-75 cursor-not-allowed`}
            // onClick={() => handleGatewaySelection('razorpay')} // Disabled until activated
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-500 flex items-center">
                  Razorpay
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-400 text-white rounded-full">
                    Coming Soon
                  </span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Perfect for Indian customers - supports UPI, cards, wallets, and net banking (Currently being activated)
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>💳 All Cards</span>
                  <span>📱 UPI</span>
                  <span>🏦 Net Banking</span>
                  <span>💰 Wallets</span>
                </div>
              </div>
              <div className="text-right">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">RZP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Paddle Option */}
          <div
            className={`border rounded-lg p-6 cursor-pointer transition-all ${
              userLocation !== 'IN' && userLocation ? 'border-[#ff5941] bg-[#ff5941] bg-opacity-5 ring-2 ring-[#ff5941] ring-opacity-20' : 'border-gray-200 hover:border-[#ff5941]'
            }`}
            onClick={() => handleGatewaySelection('paddle')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  Paddle
                  {userLocation !== 'IN' && userLocation && (
                    <span className="ml-2 px-2 py-1 text-xs bg-[#ff5941] text-white rounded-full">
                      Recommended
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Global payment solution with automatic tax handling for international customers
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>💳 Global Cards</span>
                  <span>🌍 200+ Countries</span>
                  <span>📋 Tax Handled</span>
                  <span>🏛️ Compliant</span>
                </div>
              </div>
              <div className="text-right">
                <div className="w-12 h-8 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">PDL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Both options are secure and support the same credit packages
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Choose the one that works best for your payment preferences
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentGatewaySelector;