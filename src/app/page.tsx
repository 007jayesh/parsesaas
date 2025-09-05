'use client';

import { useState, useEffect } from 'react';
import { LayoutGroup, motion } from "framer-motion";
import FileUpload from '@/components/FileUpload';
import Header from '@/components/Header';
import { useUser } from '@/contexts/UserContext';
import { apiService } from '@/services/api';
import Link from 'next/link';
import SignupPromptPopup from '@/components/SignupPromptPopup';
import ResultsPopup from '@/components/ResultsPopup';
import EnhancedResultsPopup from '@/components/EnhancedResultsPopup';
import ProcessingPopup from '@/components/ProcessingPopup';
import PaymentGatewaySelector from '@/components/PaymentGatewaySelector';
import { TextRotate } from "@/components/ui/text-rotate";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showResultsPopup, setShowResultsPopup] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'fast' | 'accurate' | 'standard'>('fast');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sampleTransactions, setSampleTransactions] = useState<any[]>([]);
  // Using table-based extraction method for all processing
  const { user, isLoggedIn, refreshUser } = useUser();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  // Handle buy credits event from header
  useEffect(() => {
    const handleBuyCredits = () => {
      setShowPaymentModal(true);
    };

    window.addEventListener('buy-credits', handleBuyCredits);
    return () => window.removeEventListener('buy-credits', handleBuyCredits);
  }, []);

  const handlePaymentSuccess = async (data: any) => {
    // Refresh user data to show updated credits
    await refreshUser();
    setShowPaymentModal(false);
  };

  const handleCancel = () => {
    if (abortController) {
      setIsCancelling(true);
      abortController.abort();
      setAbortController(null);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    
    // Check if user is logged in
    if (!isLoggedIn) {
      setShowSignupPrompt(true);
      return;
    }

    setIsConverting(true);
    setConversionResult(null);
    setProcessingLogs([]);
    setShowResults(false);
    setProcessingProgress(0);
    setShowProcessingModal(true);
    setProcessingTime(null);
    setIsCancelling(false);
    setCurrentPage(0);
    setTotalPages(0);
    setSampleTransactions([]);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    // Create sample transactions for Method 2 demo
    const sampleTxns = [
      { date: "2024-01-15", description: "ACH DEPOSIT SALARY COMPANY", amount: "$3,200.00" },
      { date: "2024-01-14", description: "DEBIT PURCHASE GROCERY STORE", amount: "-$85.42" },
      { date: "2024-01-13", description: "ATM WITHDRAWAL", amount: "-$100.00" },
      { date: "2024-01-12", description: "ONLINE TRANSFER TO SAVINGS", amount: "-$500.00" },
      { date: "2024-01-11", description: "CHECK DEPOSIT #1234", amount: "$750.00" },
      { date: "2024-01-10", description: "RECURRING PAYMENT UTILITIES", amount: "-$120.50" }
    ];
    
    let progressValue = 0;
    let currentPageValue = 1;
    let sampleTransactionIndex = 0;
    
    // Enhanced progress simulation
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        progressValue = prev;
        
        // Method 2: Simulate 4 seconds per page with sample transactions
        if (prev < 90) {
          const increment = Math.random() * 5 + 2;
          const newProgress = Math.min(prev + increment, 90);
          
          // Simulate page progression (assume 3 pages for demo)
          if (!totalPages) setTotalPages(3);
          const newCurrentPage = Math.min(Math.floor((newProgress / 90) * 3) + 1, 3);
          if (newCurrentPage !== currentPageValue) {
            currentPageValue = newCurrentPage;
            setCurrentPage(newCurrentPage);
            
            // Add a sample transaction every page
            if (sampleTransactionIndex < sampleTxns.length) {
              setSampleTransactions(prev => [...prev, sampleTxns[sampleTransactionIndex]]);
              sampleTransactionIndex++;
            }
          }
          
          return newProgress;
        }
        return prev;
      });
    }, 1000);
    
    try {
      // Call the backend API to convert the file
      const { data, error } = await apiService.convertBankStatement(selectedFile, ['csv', 'excel', 'json'], controller.signal, 'method2', selectedMethod);
      
      clearInterval(progressInterval);
      
      if (data) {
        setProcessingProgress(100);
        // Use backend processing time instead of frontend calculation
        setProcessingTime(data.processing_time_seconds || 0);
        
        // Show results immediately without delay
        setShowProcessingModal(false);
        setConversionResult(data);
        setShowResults(true);
        setShowResultsPopup(true);
        
        // Refresh user data to get updated credits
        await refreshUser();
      } else if (error) {
        clearInterval(progressInterval);
        setShowProcessingModal(false);
        alert(`Conversion failed: ${error}`);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      
      if (error.name === 'AbortError' || controller.signal.aborted) {
        // User cancelled the conversion
        setShowProcessingModal(false);
        setIsCancelling(false);
        setAbortController(null);
      } else {
        setShowProcessingModal(false);
        alert('An error occurred during conversion. Please try again.');
        console.error('Conversion error:', error);
      }
    }
    
    setIsConverting(false);
  };

  const handleDownload = async (format: string, tableConfig?: any) => {
    if (!conversionResult || !selectedFile) return;
    
    setIsDownloading(true);
    try {
      let data, mimeType, fileExtension;
      
      // Check if this is a download with table configuration
      if (tableConfig) {
        // Call backend endpoint for configured table download
        const response = await fetch('http://localhost:8000/table-convert/download-configured', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            conversion_id: conversionResult.conversion_id,
            format: format.toLowerCase(),
            table_config: tableConfig
          })
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          // Determine file extension and name
          const fileExt = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase();
          const suffix = tableConfig.outputMode === 'separate' ? '_separate_sheets' : '_combined';
          a.download = `${selectedFile.name.replace(/\.[^/.]+$/, "")}${suffix}.${fileExt}`;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setIsDownloading(false);
          return;
        } else {
          // Get the actual error message from the backend
          let errorMessage = 'Failed to download configured file';
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch (e) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          console.error('Download failed:', errorMessage);
          throw new Error(errorMessage);
        }
      }
      
      // Original download logic for simple downloads
      if (format === 'csv') {
        data = conversionResult.csv_data;
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else if (format === 'excel') {
        // Decode base64 string to binary data
        const binaryString = atob(conversionResult.excel_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        data = bytes;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
      } else if (format === 'json') {
        data = JSON.stringify(conversionResult.json_data, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      }
      
      if (data) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedFile.name.replace(/\.[^/.]+$/, "")}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    }
    setIsDownloading(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <Header />
      
      {/* Welcome Banner for Logged-in Users */}
      {isLoggedIn && (
        <div className="relative z-10 bg-gradient-to-r from-[#ff5941]/10 to-[#e04527]/5 border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ff5941] rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Welcome back, {user?.name?.split(' ')[0]}!
                  </h2>
                  <p className="text-sm text-gray-600">
                    Ready to convert your bank statements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0" style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
        opacity: 0.5
      }}></div>
      <div className="fixed inset-0 z-0" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 50%, #f3f4f6 100%)'
      }}></div>
      
      {/* Hero Section */}
      <section className="relative z-10 py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              {!isLoggedIn && (
                <>
                  <div className="inline-flex items-center bg-gray-100 text-sm border border-gray-200 rounded-full px-3 py-1 mb-8">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    99.9% Accurate Processing
                  </div>
                  
                  <div className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                    <div className="mb-2">Convert Bank Statements</div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start">
                      <LayoutGroup>
                        <motion.div className="flex items-center" layout>
                          <motion.span
                            className="mr-2"
                            layout
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                          >
                            with{" "}
                          </motion.span>
                          <TextRotate
                            texts={[
                              "Precision",
                              "Reliability", 
                              "Ease"
                            ]}
                            mainClassName="text-white px-3 bg-[#ff5941] overflow-hidden py-1 justify-center rounded-lg"
                            staggerFrom={"last"}
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "-120%" }}
                            staggerDuration={0.025}
                            splitLevelClassName="overflow-hidden pb-1"
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                            rotationInterval={2000}
                          />
                        </motion.div>
                      </LayoutGroup>
                    </div>
                  </div>
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    Transform PDF bank statements to CSV, Excel, and JSON formats. 
                    Supports banks worldwide with industry-leading accuracy.
                  </p>
                </>
              )}
              
              {!isLoggedIn && (
                <div className="bg-white/95 backdrop-blur-md border border-blue-500/20 rounded-lg px-6 py-4 mb-8 inline-block">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-[#ff5941]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900 font-semibold text-lg">
                      🔒 Files Never Stored - Processed & Deleted Instantly
                    </span>
                  </div>
                </div>
              )}

              {!isLoggedIn && (
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">99.9% Accurate</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">Global Banks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">Multiple Formats</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">Cheaper</span>
                  </div>
                </div>
              )}

              {!isLoggedIn && (
                <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Custom Solutions Built for You</h2>
                  <p className="text-gray-600 mb-4">
                    We specialize in developing tailored data processing solutions with transparent, one-time pricing. 
                    Experience professional-grade document conversion without recurring subscription costs.
                  </p>
                  <Link 
                    href="/contact"
                    className="inline-flex items-center px-6 py-3 bg-[#ff5941] hover:bg-[#e04527] text-white font-medium rounded-full transition-colors duration-200"
                  >
                    Contact Us for Custom Solutions
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}

              {/* Privacy Guarantee for logged-in users */}
              {isLoggedIn && (
                <div className="bg-white/95 backdrop-blur-md border border-blue-500/20 rounded-lg px-6 py-4 mb-8 inline-block">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-[#ff5941]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900 font-semibold text-lg">
                      🔒 Files Never Stored - Processed & Deleted Instantly
                    </span>
                  </div>
                </div>
              )}

              {/* Feature Points for logged-in users */}
              {isLoggedIn && (
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">99.9% Accurate</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">Global Banks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">Multiple Formats</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#ff5941]500 rounded-full"></div>
                    <span className="text-gray-600 text-base">Cheaper</span>
                  </div>
                </div>
              )}

              {/* Custom Solutions Section for logged-in users */}
              {isLoggedIn && (
                <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Custom Solutions Built for You</h2>
                  <p className="text-gray-600 mb-4">
                    We specialize in developing tailored data processing solutions with transparent, one-time pricing. 
                    Experience professional-grade document conversion without recurring subscription costs.
                  </p>
                  <Link 
                    href="/contact"
                    className="inline-flex items-center px-6 py-3 bg-[#ff5941] hover:bg-[#e04527] text-white font-medium rounded-full transition-colors duration-200"
                  >
                    Contact Us for Custom Solutions
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column - Upload Section */}
            <div className="relative rounded-xl p-1" style={{
              background: 'linear-gradient(135deg, rgba(255, 89, 65, 0.2), rgba(255, 89, 65, 0.15), rgba(255, 89, 65, 0.1))'
            }}>
              <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-[0_0_0_1px_rgba(139,92,246,0.2),_0_4px_24px_rgba(139,92,246,0.1)] p-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {isLoggedIn ? "Upload Bank Statement" : "Try Our Service"}
                </h3>
                <p className="text-gray-600 text-sm">
                  {isLoggedIn ? "Convert PDF to structured data" : "Upload a bank statement to see the conversion in action"}
                </p>
              </div>
              
              <FileUpload onFileSelect={handleFileSelect} />
              
              {/* Method Selection */}
              {isLoggedIn && selectedFile && (
                <div className="mt-6 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Processing Method</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedMethod('fast')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        selectedMethod === 'fast'
                          ? 'border-[#ff5941] bg-[#ff5941]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-[#ff5941]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-900 mb-1">Fast</div>
                      <div className="text-xs text-gray-600">Speed optimized</div>
                    </button>
                    <button
                      onClick={() => setSelectedMethod('accurate')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        selectedMethod === 'accurate'
                          ? 'border-[#ff5941] bg-[#ff5941]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-[#ff5941]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-900 mb-1">Accurate</div>
                      <div className="text-xs text-gray-600">Max precision</div>
                    </button>
                    <button
                      onClick={() => setSelectedMethod('standard')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        selectedMethod === 'standard'
                          ? 'border-[#ff5941] bg-[#ff5941]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-[#ff5941]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-900 mb-1">Standard</div>
                      <div className="text-xs text-gray-600">Balanced approach</div>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Processing Info */}
              {selectedFile && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Multiple Processing Methods</h5>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Every bank statement has different formats. We provide three different processing methods so you can try all approaches and find the one that works best for your specific bank statement format.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleConvert}
                disabled={!selectedFile || isConverting}
                className="w-full mt-6 relative overflow-hidden font-medium py-4 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all hover:scale-[1.02] border border-gray-200"
                style={{
                  background: 'linear-gradient(135deg, #ff5941, #e04527)',
                }}
              >
{isConverting ? "Processing..." : isLoggedIn ? "Convert Now" : "Sign Up and convert 10 free pages"}
              </button>

              {/* Processing Time Display */}
              {processingTime && !isConverting && (
                <div className="mt-4 text-center">
                  <div className="bg-white/95 backdrop-blur-md border border-green-500/30 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-400 font-medium">
                        Processing completed in {processingTime.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Show only for non-logged-in users */}
      {!isLoggedIn && (
        <section className="relative z-10 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Choose the plan that fits your needs. All plans include our core features.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {/* Basic Plan */}
              <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">₹900</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#ff5941] mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">500 pages/month</span>
                  </li>
                </ul>
                <Link href="/signup" className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-3 px-4 rounded-full font-medium transition-colors block text-center">
                  Get Started
                </Link>
              </div>

              {/* Standard Plan */}
              <div className="bg-white/90 backdrop-blur-md border border-[#ff5941]/30 rounded-lg p-6 relative shadow-[0_20px_40px_-10px_rgba(255,89,65,0.1)]">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-[#ff5941] text-white px-3 py-1 rounded-full text-xs font-medium">
                    Popular
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Standard</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">₹1,750</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#ff5941] mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">1,000 pages/month</span>
                  </li>
                </ul>
                <Link href="/signup" className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-3 px-4 rounded-full font-medium transition-colors block text-center">
                  Get Started
                </Link>
              </div>

              {/* Professional Plan */}
              <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">₹4,250</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#ff5941] mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">5,000 pages/month</span>
                  </li>
                </ul>
                <Link href="/signup" className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-3 px-4 rounded-full font-medium transition-colors block text-center">
                  Get Started
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise</h3>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">Custom</span>
                  <div className="text-xs text-[#ff5941] font-medium mt-1">One-time payment available</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#ff5941] mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">Unlimited pages</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#ff5941] mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">Custom formats</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#ff5941] mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">Dedicated support</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-[#ff5941] mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">On-premise option</span>
                  </li>
                </ul>
                <Link href="/contact" className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-3 px-4 rounded-full font-medium transition-colors block text-center">
                  Contact Sales
                </Link>
              </div>
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-600 mb-4">
                Simple pricing. 1 Credit = 1 Page. All plans include secure processing and instant conversion.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Additional Content Section */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {isLoggedIn && user && user.credits <= 0 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-red-400 mb-2">
                  No credits remaining
                </p>
                <Link 
                  href="/pricing"
                  className="text-[#ff5941] hover:text-blue-400 text-sm font-medium"
                >
                  Buy More Credits
                </Link>
              </div>
            )}


          </div>

          {/* Privacy & Contact Message */}
          <div className="text-center mt-8 space-y-2">
            <p className="text-sm text-gray-600">
              Files are processed securely and never stored on our servers
            </p>
            <p className="text-sm text-gray-500">
              Found an error? <Link href="/contact" className="text-[#ff5941] hover:text-blue-400">Email us</Link> - we're continuously improving our system
            </p>
          </div>
        </div>
      </section>

      {/* Signup Prompt Popup */}
      <SignupPromptPopup 
        isOpen={showSignupPrompt} 
        onClose={() => setShowSignupPrompt(false)} 
      />

      {/* Results Popup */}
      <EnhancedResultsPopup
        isOpen={showResultsPopup}
        onClose={() => setShowResultsPopup(false)}
        transactions={conversionResult?.transactions || []}
        creditsUsed={conversionResult?.credits_used || 0}
        fileName={selectedFile?.name || ''}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        tableInfo={conversionResult?.table_info || []}
        processingMethod={selectedMethod}
      />

      {/* Processing Popup */}
      <ProcessingPopup
        isVisible={showProcessingModal}
        progress={processingProgress}
        fileName={selectedFile?.name}
        onCancel={handleCancel}
        isCancelling={isCancelling}
        method={selectedMethod}
        currentPage={currentPage}
        totalPages={totalPages}
        sampleTransactions={sampleTransactions}
        timePerPage={4}
      />

      {/* Payment Gateway Selector */}
      {showPaymentModal && (
        <PaymentGatewaySelector
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}