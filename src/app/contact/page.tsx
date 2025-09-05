'use client';

import { useState } from 'react';
import Header from '@/components/Header';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:8000/contact/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.detail || 'An error occurred while sending your message.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Contact Us
            </h1>
            <p className="text-xl text-gray-600">
              We're here to help with any questions or issues
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {submitStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Message sent successfully!</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Thank you for your message! We'll get back to you soon.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error sending message</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{errorMessage}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-2">
                    Your Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 bg-white/90 backdrop-blur-md text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5941] focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 bg-white/90 backdrop-blur-md text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5941] focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-600 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    required
                    disabled={isSubmitting}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 bg-white/90 backdrop-blur-md text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5941] focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a subject</option>
                    <option value="parsing-error">Parsing Error</option>
                    <option value="feature-request">Feature Request</option>
                    <option value="billing">Billing Question</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-600 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    disabled={isSubmitting}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 bg-white/90 backdrop-blur-md text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5941] focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Please describe your question or issue in detail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#ff5941] hover:bg-[#e04527] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get in touch</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Email Support</h3>
                  <p className="text-gray-600 mb-2">
                    For general questions and support:
                  </p>
                  <a 
                    href="mailto:support@thebankstatementparser.com" 
                    className="text-[#ff5941] hover:text-[#e04527] font-medium"
                  >
                    support@thebankstatementparser.com
                  </a>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Report Parsing Errors</h3>
                  <p className="text-gray-600 mb-2">
                    Found an error in your conversion? Help us improve:
                  </p>
                  <a 
                    href="mailto:support@thebankstatementparser.com" 
                    className="text-[#ff5941] hover:text-[#e04527] font-medium"
                  >
                    support@thebankstatementparser.com
                  </a>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Enterprise Sales</h3>
                  <p className="text-gray-600 mb-2">
                    Need a custom solution for your business?
                  </p>
                  <a 
                    href="mailto:support@thebankstatementparser.com" 
                    className="text-[#ff5941] hover:text-[#e04527] font-medium"
                  >
                    support@thebankstatementparser.com
                  </a>
                </div>

                <div className="bg-white/90 backdrop-blur-md border border-gray-200 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Response Times</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• General inquiries: Within 24 hours</li>
                    <li>• Technical support: Within 12 hours</li>
                    <li>• Parsing errors: Within 6 hours</li>
                    <li>• Enterprise customers: Within 2 hours</li>
                  </ul>
                </div>

                <div className="bg-white/90 backdrop-blur-md border border-gray-200 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Help Us Improve</h3>
                  <p className="text-gray-600">
                    We're continuously improving our parsing system. If you encounter any errors or have 
                    suggestions for new features, please don't hesitate to reach out. Your feedback makes 
                    our service better for everyone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}