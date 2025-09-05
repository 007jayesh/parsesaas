'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { apiService } from '@/services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setEmailSent(true);
        setMessage('Password reset instructions have been sent to your email address.');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
                    EMAIL SENT
                  </span>
                  <h2 className="text-2xl font-bold text-slate-800">Check Your Email</h2>
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
                  
                  <h3 className="text-xl font-semibold text-neutral-200 mb-4">Reset Link Sent</h3>
                  <p className="text-neutral-400 text-sm mb-6">
                    We've sent password reset instructions to <span className="text-neutral-200 font-medium">{email}</span>
                  </p>
                  
                  <div className="space-y-4">
                    <p className="text-xs text-neutral-500">
                      Didn't receive the email? Check your spam folder or contact support.
                    </p>
                    
                    <div className="pt-4">
                      <Link
                        href="/login"
                        className="w-full px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition flex items-center justify-center font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                        Back to Login
                      </Link>
                    </div>
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
                  PASSWORD RECOVERY
                </span>
                <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
                <div className="h-1 w-12 bg-neutral-400 mt-2 rounded-full"></div>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="p-6 flex flex-col bg-neutral-900">
              <div>
                <span className="px-2 py-1 bg-neutral-800 rounded-full text-xs text-neutral-400 mb-2 inline-block">
                  EMAIL VERIFICATION
                </span>
                <h3 className="text-xl font-semibold text-neutral-200 mb-4">Enter Your Email</h3>
                <p className="text-neutral-400 text-sm mb-6">
                  We'll send you a link to reset your password
                </p>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-300">{message}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="email" className="text-neutral-300 text-xs font-medium block mb-1">
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-600 text-sm"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </form>
                
                <div className="flex justify-between text-sm space-x-3">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-600 text-neutral-200 rounded-lg transition flex items-center justify-center font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
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
                  Remember your password? <Link href="/login" className="text-neutral-300 hover:underline">Sign In</Link>
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