'use client';

import React, { useEffect, useState } from 'react';

interface RazorpayCheckoutProps {
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}

interface CreditPackage {
  credits: number;
  amount_paise: number;
  amount_display: string;
  description: string;
  currency: string;
}

interface Packages {
  [key: string]: CreditPackage;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({ onSuccess, onClose }) => {
  const [packages, setPackages] = useState<Packages>({});
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('professional');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const loadRazorpay = () => {
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => console.error('Failed to load Razorpay script');
      document.head.appendChild(script);
    };

    loadRazorpay();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('http://localhost:8000/razorpay/packages', {
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
            amount_paise: 82500,
            amount_display: '₹825',
            description: 'Perfect for small businesses',
            currency: 'INR'
          },
          professional: {
            credits: 500,
            amount_paise: 330000,
            amount_display: '₹3,300',
            description: 'Best for growing teams',
            currency: 'INR'
          },
          enterprise: {
            credits: 1500,
            amount_paise: 825000,
            amount_display: '₹8,250',
            description: 'For large scale operations',
            currency: 'INR'
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      // Set default packages if API fails
      setPackages({
        starter: {
          credits: 100,
          amount_paise: 82500,
          amount_display: '₹825',
          description: 'Perfect for small businesses',
          currency: 'INR'
        },
        professional: {
          credits: 500,
          amount_paise: 330000,
          amount_display: '₹3,300',
          description: 'Best for growing teams',
          currency: 'INR'
        },
        enterprise: {
          credits: 1500,
          amount_paise: 825000,
          amount_display: '₹8,250',
          description: 'For large scale operations',
          currency: 'INR'
        }
      });
    }
  };

  const handlePurchase = async () => {
    if (!razorpayLoaded || !selectedPackage) return;

    setLoading(true);
    try {
      // Create order on backend
      const response = await fetch('http://localhost:8000/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          package_id: selectedPackage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 500) {
          throw new Error('Payment service is temporarily unavailable. Please try again later or contact support.');
        }
        throw new Error(errorData?.detail || 'Failed to create order');
      }

      const orderData = await response.json();
      const selectedPkg = packages[selectedPackage];

      // Configure Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'The Bank Statement Parser',
        description: `${selectedPkg.credits} Processing Credits`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('http://localhost:8000/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                package_id: selectedPackage
              })
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              alert(`Payment successful! ${verifyData.credits_added} credits added to your account.`);
              onSuccess?.(verifyData);
              onClose?.();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: 'User',
          email: 'user@example.com',
        },
        notes: {
          package_id: selectedPackage,
          credits: selectedPkg.credits.toString()
        },
        theme: {
          color: '#ff5941'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
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
                  <p className="text-2xl font-bold text-gray-900">{pkg.amount_display}</p>
                  <p className="text-sm text-gray-500">
                    ₹{(pkg.amount_paise / 100 / pkg.credits).toFixed(2)} per credit
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
            disabled={loading || !selectedPackage || !razorpayLoaded}
            className="flex-1 bg-[#ff5941] text-white px-4 py-2 rounded-md hover:bg-[#e04527] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Pay with Razorpay'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Secure payment powered by Razorpay
          </p>
          <div className="flex justify-center items-center mt-2 space-x-2 text-xs text-gray-400">
            <span>🔒 SSL Secured</span>
            <span>•</span>
            <span>💳 Cards & UPI</span>
            <span>•</span>
            <span>🏦 Net Banking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RazorpayCheckout;