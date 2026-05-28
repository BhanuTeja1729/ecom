interface LegalProps {
  page: 'privacy' | 'terms';
}

export function Legal({ page }: LegalProps) {
  const isPrivacy = page === 'privacy';

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="bg-gray-950 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-black text-white">{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
          <p className="text-gray-400 mt-2">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {isPrivacy ? (
          <div className="prose prose-gray max-w-none space-y-8">
            {[
              {
                title: '1. Information We Collect',
                body: 'We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This includes your name, email address, shipping address, payment information (processed securely through our payment providers), and any other information you choose to provide.\n\nWe also automatically collect certain information when you use our services, including log data (IP address, browser type, pages visited), device information, cookies, and similar tracking technologies.',
              },
              {
                title: '2. How We Use Your Information',
                body: 'We use the information we collect to process transactions and send related information, including purchase confirmations and invoices; provide customer support; send promotional communications (with your consent); improve and personalize your experience; analyze usage patterns; detect and prevent fraud; and comply with legal obligations.',
              },
              {
                title: '3. Information Sharing',
                body: 'We do not sell your personal information. We may share your information with: service providers who perform services on our behalf (payment processors, shipping carriers, email providers); business partners with your consent; law enforcement when required by law; and in connection with a merger, acquisition, or sale of assets.',
              },
              {
                title: '4. Data Security',
                body: 'We implement industry-standard security measures to protect your information, including 256-bit SSL encryption for all data transmission, secure payment processing through PCI DSS compliant providers, and regular security audits. However, no method of transmission over the internet is 100% secure.',
              },
              {
                title: '5. Cookies',
                body: 'We use cookies and similar tracking technologies to enhance your experience, remember your preferences, analyze site traffic, and serve targeted advertisements. You can control cookie settings through your browser settings, though disabling cookies may affect site functionality.',
              },
              {
                title: '6. Your Rights',
                body: 'Depending on your location, you may have rights including: access to your personal data; correction of inaccurate data; deletion of your data; portability of your data; and opting out of marketing communications. Contact us at privacy@blipzo.com to exercise these rights.',
              },
              {
                title: '7. Contact Us',
                body: 'If you have questions about this Privacy Policy, please contact us at: BLIPZO Innovations Pvt. Ltd., Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K, India – 180005. Email: privacy@blipzo.com.',
              },
            ].map(({ title, body }) => (
              <div key={title}>
                <h2 className="text-xl font-black text-gray-900 mb-3">{title}</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {[
              {
                title: '1. Acceptance of Terms',
                body: 'By accessing or using the BLIPZO website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. We reserve the right to update these terms at any time.',
              },
              {
                title: '2. Account Responsibility',
                body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account. We reserve the right to terminate accounts that violate our policies.',
              },
              {
                title: '3. Products and Pricing',
                body: 'We reserve the right to modify product descriptions, pricing, and availability without notice. In the event of a pricing error, we reserve the right to cancel orders at the incorrect price and will notify you promptly. All prices are in INR unless otherwise stated.',
              },
              {
                title: '4. Orders and Payment',
                body: 'By placing an order, you represent that the payment information is accurate and that you have the right to use the payment method. Orders are subject to availability and confirmation. We reserve the right to refuse or cancel any order for any reason.',
              },
              {
                title: '5. Intellectual Property',
                body: 'All content on the BLIPZO website, including text, graphics, logos, images, and software, is the property of BLIPZO Innovations Pvt. Ltd. or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.',
              },
              {
                title: '6. Limitation of Liability',
                body: 'To the maximum extent permitted by law, BLIPZO Innovations Pvt. Ltd. shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services. Our total liability shall not exceed the amount paid by you in the past 12 months.',
              },
              {
                title: '7. Governing Law',
                body: 'These terms shall be governed by the laws of India, specifically under the jurisdiction of courts in Jammu, Jammu & Kashmir. Any disputes shall be resolved in the courts of Jammu.',
              },
              {
                title: '8. Contact Information',
                body: 'For questions about these Terms, contact us at: legal@blipzo.com or BLIPZO Innovations Pvt. Ltd., Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K, India – 180005.',
              },
            ].map(({ title, body }) => (
              <div key={title}>
                <h2 className="text-xl font-black text-gray-900 mb-3">{title}</h2>
                <p className="text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
