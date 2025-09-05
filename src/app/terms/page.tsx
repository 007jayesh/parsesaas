import Header from '@/components/Header';

export default function Terms() {
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
              Terms of Service
            </h1>
            <p className="text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg mx-auto">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing and using The Bank Statement Parser ("the Service"), you accept and agree to be bound by the terms and 
                provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use License</h2>
              <p className="text-gray-600 mb-4">
                Permission is granted to use The Bank Statement Parser for personal or commercial purposes. 
                This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc ml-6 text-gray-600 mb-4">
                <li>modify or copy the materials</li>
                <li>attempt to reverse engineer any software contained in the Service</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
                <li>use the service to process documents you do not have legal right to access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Privacy and Data Security</h2>
              <p className="text-gray-600 mb-4">
                We take your privacy seriously. All uploaded files are processed in real-time and immediately 
                deleted from our servers after conversion. We do not store, archive, or retain any of your 
                financial documents or extracted data.
              </p>
              <p className="text-gray-600 mb-4">
                Your data is encrypted during transmission and processing. We use industry-standard security 
                measures to protect your information during the conversion process.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Service Availability</h2>
              <p className="text-gray-600 mb-4">
                We strive to maintain high service availability but do not guarantee uninterrupted service. 
                The service may be temporarily unavailable for maintenance, updates, or due to circumstances 
                beyond our control.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Accuracy and Limitations</h2>
              <p className="text-gray-600 mb-4">
                While we strive for high accuracy in our parsing service, we cannot guarantee 100% accuracy 
                for all bank statement formats. Users should verify the accuracy of converted data before 
                using it for important financial decisions.
              </p>
              <p className="text-gray-600 mb-4">
                We continuously improve our parsing algorithms based on user feedback and new bank formats. 
                If you encounter parsing errors, please report them to help us improve the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payment Terms</h2>
              <p className="text-gray-600 mb-4">
                Our service uses a credit-based system where each page processed consumes one credit. 
                Credits are purchased through secure payment gateways including Razorpay (for Indian users) 
                and Paddle (for international users). All credit purchases are final and non-refundable 
                except as required by law.
              </p>
              <p className="text-gray-600 mb-4">
                We reserve the right to change our pricing at any time with 30 days notice to existing customers. 
                Credits do not expire but account termination will result in loss of unused credits.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Prohibited Uses</h2>
              <p className="text-gray-600 mb-4">You may not use our service:</p>
              <ul className="list-disc ml-6 text-gray-600 mb-4">
                <li>For any unlawful purpose or to solicit others to perform such acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimer</h2>
              <p className="text-gray-600 mb-4">
                The information on this website is provided on an "as is" basis. To the fullest extent 
                permitted by law, The Bank Statement Parser excludes all representations, warranties, conditions and 
                terms whether express or implied.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitations</h2>
              <p className="text-gray-600 mb-4">
                In no event shall The Bank Statement Parser or its suppliers be liable for any damages (including, 
                without limitation, damages for loss of data or profit, or due to business interruption) 
                arising out of the use or inability to use the materials on our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Revisions and Errata</h2>
              <p className="text-gray-600 mb-4">
                We may revise these terms of service at any time without notice. By using this website, 
                you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-gray-600 mb-4">
                <strong>The Bank Statement Parser</strong><br />
                Email: <a href="mailto:support@thebankstatementparser.com" className="text-[#ff5941] hover:text-[#e04527]">
                  support@thebankstatementparser.com
                </a><br />
                Website: <a href="https://thebankstatementparser.com" className="text-[#ff5941] hover:text-[#e04527]">
                  thebankstatementparser.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}