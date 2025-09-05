import Header from '@/components/Header';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Background Shader Effect */}
      <div className="fixed inset-0 z-0" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
      }}></div>
      
      <div className="relative z-10 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include our core features.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white/90 backdrop-blur-md border border-purple-500/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">₹900</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">500 pages/month</span>
                </li>
              </ul>
              <button className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-2 px-4 rounded-full font-medium transition-colors">
                Get Started
              </button>
            </div>

            {/* Standard Plan */}
            <div className="bg-white/90 backdrop-blur-md border border-[#ff5941]/30 rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#ff5941] text-white px-3 py-1 rounded-full text-xs font-medium">
                  Popular
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Standard</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">₹1,750</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">1,000 pages/month</span>
                </li>
              </ul>
              <button className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-2 px-4 rounded-full font-medium transition-colors">
                Get Started
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-white/90 backdrop-blur-md border border-purple-500/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">₹4,250</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">5,000 pages/month</span>
                </li>
              </ul>
              <button className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-2 px-4 rounded-full font-medium transition-colors">
                Get Started
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white/90 backdrop-blur-md border border-purple-500/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise</h3>
              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">Custom</span>
                <div className="text-xs text-[#ff5941]600 font-medium mt-1">One-time payment available</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">Unlimited pages</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">Custom formats</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">Dedicated support</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">On-premise option</span>
                </li>
              </ul>
              <button className="w-full bg-[#ff5941] hover:bg-[#e04527] text-white py-2 px-4 rounded-full font-medium transition-colors">
                Contact Us
              </button>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Simple pricing. 1 Credit = 1 Page. All plans include secure processing and instant conversion.
            </p>
            <p className="text-sm text-gray-500">
              Need help choosing? <a href="/contact" className="text-[#ff5941]600 hover:text-[#ff5941]700">Contact us</a> for personalized recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}