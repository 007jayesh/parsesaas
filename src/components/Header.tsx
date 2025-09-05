'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import ClientOnly from '@/components/ClientOnly';

export default function Header() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useUser();

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="The Bank Statement Parser"
              width={500}
              height={500}
              className="h-16 w-72"
              priority
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-sm font-medium ${pathname === '/' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Home
            </Link>
            <Link 
              href="/pricing" 
              className={`text-sm font-medium ${pathname === '/pricing' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Pricing
            </Link>
            <Link 
              href="/about" 
              className={`text-sm font-medium ${pathname === '/about' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-900'}`}
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className={`text-sm font-medium ${pathname === '/contact' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Contact
            </Link>
            <Link 
              href="/terms" 
              className={`text-sm font-medium ${pathname === '/terms' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Terms
            </Link>
          </nav>

          {/* User Section */}
          <ClientOnly 
            fallback={
              <div className="flex items-center space-x-3">
                <Link 
                  href="/login" 
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-[#ff5941] hover:bg-[#e04527] text-gray-900 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            }
          >
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                {/* Credits Display with Buy Button */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-[#ff5941]/10 backdrop-blur-md px-3 py-1 rounded-full border border-[#ff5941]/20">
                    <svg className="w-4 h-4 text-[#ff5941] mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      {user?.credits} credits
                    </span>
                  </div>
                  {(user?.credits || 0) < 10 && (
                    <button 
                      onClick={() => {
                        // This will be handled by the parent component
                        const event = new CustomEvent('buy-credits');
                        window.dispatchEvent(event);
                      }}
                      className="bg-[#ff5941] hover:bg-[#e04527] text-white px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    >
                      Buy Credits
                    </button>
                  )}
                </div>
                
                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                    <div className="w-8 h-8 bg-[#ff5941] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                      </div>
                      <Link href="/" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                        Home
                      </Link>
                      <Link href="/pricing" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                        Buy Credits
                      </Link>
                      <button 
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/login" 
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-[#ff5941] hover:bg-[#e04527] text-gray-900 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </ClientOnly>
        </div>
      </div>
    </header>
  );
}