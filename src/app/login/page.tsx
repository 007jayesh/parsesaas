'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import GoogleSignIn from '@/components/GoogleSignIn';
import { useUser } from '@/contexts/UserContext';
import { apiService } from '@/services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginWithUser } = useUser();
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
        setError(error || 'Google sign-in failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during Google sign-in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/');
      } else {
        setError('Invalid email or password. Try demo@example.com / demo');
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
                  SECURE ACCESS
                </span>
                <h2 className="text-2xl font-bold text-gray-900">Login Portal</h2>
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
                  AUTHENTICATION
                </span>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Account Login</h3>

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
                    buttonText="signin_with"
                  />
                </div>

                {/* Divider */}
                <div className="divider-gradient mb-6"></div>
                
                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="email" className="text-gray-600 text-xs font-medium block mb-1">
                      EMAIL
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
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="password" className="text-gray-600 text-xs font-medium">
                        PASSWORD
                      </label>
                      <Link href="/forgot-password" className="text-[#ff5941]600 text-xs hover:text-[#ff5941]700">
                        Forgot?
                      </Link>
                    </div>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/90 backdrop-blur-md border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-4 h-4 bg-white/90 backdrop-blur-md border border-gray-300 rounded mr-2"
                    />
                    <label htmlFor="remember" className="text-gray-600 text-xs">
                      Remember this device
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {isLoading ? 'Signing In...' : 'Login'}
                  </button>
                  <Link
                    href="/signup"
                    className="flex-1 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-purple-500/30 hover:bg-white/50 text-gray-600 rounded-lg transition flex items-center justify-center font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Sign Up
                  </Link>
                </div>
              </div>
              
              <div className="mt-6 pt-4 text-center">
                <div className="divider-gradient mb-4"></div>
                <p className="text-gray-400 text-xs">
                  Need help? <Link href="/contact" className="text-[#ff5941]600 hover:text-[#ff5941]700">Contact Support</Link>
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