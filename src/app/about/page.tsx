import Header from '@/components/Header';
import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Background Shader Effect */}
      <div className="fixed inset-0 z-0" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
      }}></div>
      
      <div className="relative z-10 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              About The Bank Statement Parser
            </h1>
            <p className="text-xl text-gray-600">
              Making bank statement conversion simple and accurate
            </p>
          </div>

          <div className="prose prose-lg mx-auto">
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 mb-6">
                We believe that financial data should be accessible and easy to work with. The Bank Statement Parser was created 
                to solve the common problem of converting PDF bank statements into usable data formats like CSV, Excel, and JSON.
              </p>
              <p className="text-gray-600">
                Our mission is to provide the most accurate and secure bank statement parsing service, supporting 
                financial institutions worldwide and helping individuals and businesses manage their financial data more effectively.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why We're Different</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">99.9% Accuracy</h3>
                  <p className="text-gray-600">
                    Our advanced AI-powered parsing engine ensures the highest accuracy rates in the industry, 
                    continuously learning from new bank formats and statements.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Global Bank Support</h3>
                  <p className="text-gray-600">
                    We support bank statements from financial institutions worldwide, with specialized parsing 
                    for different regional formats and currencies.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Multiple Output Formats</h3>
                  <p className="text-gray-600">
                    Get your data in the format you need - CSV for spreadsheets, Excel for analysis, 
                    or JSON for applications and APIs.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Security First</h3>
                  <p className="text-gray-600">
                    Your financial data is never stored on our servers. All processing happens in real-time 
                    with immediate file deletion after conversion.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Continuous Improvement</h2>
              <p className="text-gray-600 mb-4">
                We're constantly improving our system based on user feedback and new bank statement formats. 
                If you encounter any parsing errors, please{' '}
                <Link href="/contact" className="text-[#ff5941] hover:text-[#e04527]">
                  email us
                </Link>{' '}
                with the details.
              </p>
              <p className="text-gray-600">
                Your feedback helps us enhance our parsing algorithms and add support for new bank formats, 
                making the service better for everyone.
              </p>
            </section>

            <section className="bg-white/90 backdrop-blur-md border border-gray-200 p-8 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started Today</h2>
              <p className="text-gray-600 mb-6">
                Ready to convert your bank statements? Try our service now or contact us if you have any questions.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="/" 
                  className="bg-[#ff5941] hover:bg-[#e04527] text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  Start Converting
                </a>
                <a 
                  href="/contact" 
                  className="bg-white/30 backdrop-blur-md border border-gray-300 hover:bg-white/50 text-gray-900 px-6 py-3 rounded-full font-medium transition-colors"
                >
                  Contact Us
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}