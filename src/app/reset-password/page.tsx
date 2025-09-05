'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Head from 'next/head';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }

    // Initialize Vanta.js animation after component mounts
    const initVanta = () => {
      if (typeof window !== 'undefined' && window.VANTA) {
        window.VANTA.NET({
          el: "#vanta-canvas",
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 150,
          minWidth: 200,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x1e40af,
          backgroundColor: 0x171717,
          points: 8,
          maxDistance: 20.00,
          spacing: 18.00,
          showDots: true
        });
      }
    };

    // Load Three.js and Vanta.js
    if (typeof window !== 'undefined') {
      const loadScripts = async () => {
        // Load Three.js
        if (!window.THREE) {
          const threeScript = document.createElement('script');
          threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
          document.head.appendChild(threeScript);
          await new Promise(resolve => threeScript.onload = resolve);
        }

        // Load Vanta.js
        if (!window.VANTA) {
          const vantaScript = document.createElement('script');
          vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js';
          document.head.appendChild(vantaScript);
          await new Promise(resolve => vantaScript.onload = resolve);
        }

        initVanta();
      };

      loadScripts();
    }

    return () => {
      // Cleanup Vanta effect
      if (typeof window !== 'undefined' && window.VANTA) {
        const vantaElement = document.querySelector('#vanta-canvas');
        if (vantaElement && vantaElement.vantaEffect) {
          vantaElement.vantaEffect.destroy();
        }
      }
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: token,
          new_password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setError(data.detail || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <Head>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
        </Head>
        <div className="bg-neutral-950 min-h-screen flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
          <style jsx>{`
            .card-container {
              position: relative;
              z-index: 0;
            }
            .card-container::before {
              content: "";
              position: absolute;
              inset: -1px;
              background: linear-gradient(to bottom right, #525252, transparent, #262626);
              border-radius: 0.75rem;
              z-index: -1;
            }
            .card-content {
              border-radius: 0.75rem;
              overflow: hidden;
              background: #171717;
            }
            .divider-gradient {
              height: 1px;
              background: linear-gradient(to right, transparent, #525252, transparent);
            }
            #vanta-canvas {
              overflow: hidden;
            }
          `}</style>

          <div className="max-w-md w-full card-container">
            <div className="card-content shadow-lg backdrop-blur-sm">
              {/* Animated Header */}
              <div className="h-[150px] relative" id="vanta-canvas">
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-2 py-1 bg-neutral-800/80 rounded-full text-xs text-neutral-400 mb-2 inline-block">
                    SUCCESS
                  </span>
                  <h2 className="text-2xl font-bold text-slate-800">Password Reset</h2>
                  <div className="h-1 w-12 bg-green-400 mt-2 rounded-full"></div>
                </div>
              </div>
              
              {/* Success Content */}
              <div className="p-6 flex flex-col bg-neutral-900">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-900/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-neutral-200 mb-4">Password Updated</h3>
                  <p className="text-neutral-400 text-sm mb-6">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                  
                  <div className="pt-4">
                    <Link
                      href="/login"
                      className="w-full px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition flex items-center justify-center font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign In Now
                    </Link>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 text-center">
                  <div className="divider-gradient mb-4"></div>
                  <div className="flex items-center justify-center mt-4 space-x-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-neutral-400 text-xs">System Status: Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
      </Head>
      <div className="bg-neutral-950 min-h-screen flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <style jsx>{`
          .card-container {
            position: relative;
            z-index: 0;
          }
          .card-container::before {
            content: "";
            position: absolute;
            inset: -1px;
            background: linear-gradient(to bottom right, #525252, transparent, #262626);
            border-radius: 0.75rem;
            z-index: -1;
          }
          .card-content {
            border-radius: 0.75rem;
            overflow: hidden;
            background: #171717;
          }
          .divider-gradient {
            height: 1px;
            background: linear-gradient(to right, transparent, #525252, transparent);
          }
          #vanta-canvas {
            overflow: hidden;
          }
        `}</style>

        <div className="max-w-md w-full card-container">
          <div className="card-content shadow-lg backdrop-blur-sm">
            {/* Animated Header */}
            <div className="h-[150px] relative" id="vanta-canvas">
              <div className="absolute top-4 left-4 z-10">
                <span className="px-2 py-1 bg-neutral-800/80 rounded-full text-xs text-neutral-400 mb-2 inline-block">
                  SECURE UPDATE
                </span>
                <h2 className="text-2xl font-bold text-slate-800">New Password</h2>
                <div className="h-1 w-12 bg-neutral-400 mt-2 rounded-full"></div>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="p-6 flex flex-col bg-neutral-900">
              <div>
                <span className="px-2 py-1 bg-neutral-800 rounded-full text-xs text-neutral-400 mb-2 inline-block">
                  PASSWORD SETUP
                </span>
                <h3 className="text-xl font-semibold text-neutral-200 mb-4">Create New Password</h3>
                <p className="text-neutral-400 text-sm mb-6">
                  Enter your new password below
                </p>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="password" className="text-neutral-300 text-xs font-medium block mb-1">
                      NEW PASSWORD
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-600 text-sm"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="text-neutral-300 text-xs font-medium block mb-1">
                      CONFIRM PASSWORD
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-600 text-sm"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </form>
                
                <div className="flex justify-between text-sm space-x-3">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isLoading || !token}
                    className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-600 text-neutral-200 rounded-lg transition flex items-center justify-center font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0v6a2 2 0 01-2 2h-8a2 2 0 01-2-2V9a2 2 0 012-2m0 0V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12l2 2 4-4" />
                    </svg>
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                  <Link
                    href="/login"
                    className="flex-1 px-4 py-2.5 bg-white hover:bg-neutral-800 text-neutral-300 rounded-lg transition flex items-center justify-center font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back to Login
                  </Link>
                </div>
              </div>
              
              <div className="mt-6 pt-4 text-center">
                <div className="divider-gradient mb-4"></div>
                <p className="text-neutral-400 text-xs">
                  Password must be at least 6 characters
                </p>
                <div className="flex items-center justify-center mt-4 space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-neutral-400 text-xs">System Status: Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}