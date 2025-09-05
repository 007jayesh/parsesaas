'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import GoogleSignIn from '@/components/GoogleSignIn';
import { useUser } from '@/contexts/UserContext';
import { apiService } from '@/services/api';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, loginWithUser } = useUser();
  const router = useRouter();

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
          color: 0xff5941,
          backgroundColor: 0x000000,
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

  const handleGoogleSuccess = async (credential: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error } = await apiService.googleOAuth(credential);
      
      if (data && data.user) {
        loginWithUser(data.user);
        router.push('/');
      } else {
        setError(error || 'Google sign-up failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during Google sign-up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-up was cancelled or failed. Please try again.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await register(name, email, password);
      if (success) {
        router.push('/');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
      </Head>
      <div className="min-h-screen bg-white flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Background Shader Effect */}
        <div className="fixed inset-0 z-0" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
        }}></div>
        <style jsx>{`
          .card-container {
            position: relative;
            z-index: 0;
          }
          .card-container::before {
            content: "";
            position: absolute;
            inset: -1px;
            background: linear-gradient(to bottom right, #ff5941, transparent, #e04527);
            border-radius: 0.75rem;
            z-index: -1;
          }
          .card-content {
            border-radius: 0.75rem;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.95);
          }
          .divider-gradient {
            height: 1px;
            background: linear-gradient(to right, transparent, #ff5941, transparent);
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
                <span className="px-2 py-1 bg-[#ff5941]900/50 backdrop-blur-md rounded-full text-xs text-[#ff5941]300 mb-2 inline-block">
                  NEW ACCOUNT
                </span>
                <h2 className="text-2xl font-bold text-gray-900">Join Portal</h2>
                <div className="h-1 w-12 bg-[#ff5941]400 mt-2 rounded-full"></div>
              </div>
              <div className="absolute top-4 right-4 z-10">
                <Link
                  href="/"
                  className="px-3 py-1.5 bg-gray-100/90 backdrop-blur-md hover:bg-gray-200/90 text-gray-600 hover:text-gray-900 rounded-full text-xs font-medium transition flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Home
                </Link>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="p-6 flex flex-col bg-white/90 backdrop-blur-md">
              <div>
                <span className="px-2 py-1 bg-[#ff5941]900/50 backdrop-blur-md rounded-full text-xs text-[#ff5941]300 mb-2 inline-block">
                  REGISTRATION
                </span>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Account</h3>

                {/* Welcome Bonus Highlight */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-600">
                        Free Welcome Bonus
                      </p>
                      <p className="text-xs text-green-500">
                        Convert 10 pages free when you sign up
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Google Sign-In */}
                <div className="mb-6">
                  <GoogleSignIn 
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    disabled={isLoading}
                  />
                </div>

                {/* Divider */}
                <div className="divider-gradient mb-6"></div>
                
                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="name" className="text-gray-600 text-xs font-medium block mb-1">
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/90 backdrop-blur-md border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="text-gray-600 text-xs font-medium block mb-1">
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/90 backdrop-blur-md border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-sm"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="text-gray-600 text-xs font-medium block mb-1">
                      PASSWORD
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/90 backdrop-blur-md border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-sm"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="text-gray-600 text-xs font-medium block mb-1">
                      CONFIRM PASSWORD
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/90 backdrop-blur-md border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-sm"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="terms"
                      className="w-4 h-4 bg-white/90 backdrop-blur-md border border-gray-300 rounded mr-2"
                      required
                    />
                    <label htmlFor="terms" className="text-gray-600 text-xs">
                      I agree to the <Link href="/terms" className="text-[#ff5941]600 hover:text-[#ff5941]700">Terms of Service</Link>
                    </label>
                  </div>
                </form>
                
                <div className="flex justify-between text-sm space-x-3">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 bg-[#ff5941]600 hover:bg-[#ff5941]700 disabled:bg-[#ff5941]400 text-gray-900 rounded-lg transition flex items-center justify-center font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </button>
                  <Link
                    href="/login"
                    className="flex-1 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-purple-500/30 hover:bg-white/50 text-gray-600 rounded-lg transition flex items-center justify-center font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </Link>
                </div>
              </div>
              
              <div className="mt-6 pt-4 text-center">
                <div className="divider-gradient mb-4"></div>
                <p className="text-gray-400 text-xs">
                  Password must be at least 6 characters
                </p>
                <div className="flex items-center justify-center mt-4 space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-gray-400 text-xs">System Status: Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}