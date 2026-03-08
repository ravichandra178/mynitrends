export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/" className="text-blue-600 hover:underline text-sm">← Back to MyNitrends</a>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              MyNitrends ("we," "us," or "our") is an AI-powered social media automation tool that helps users
              discover trends and create content for their Facebook Pages. This Privacy Policy explains how we
              collect, use, and protect your information when you use our application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-2">When you use MyNitrends, we may collect:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Facebook Account Information:</strong> Your Facebook user ID, name, and profile picture when you log in with Facebook.</li>
              <li><strong>Facebook Page Information:</strong> Page names, IDs, and access tokens for pages you manage.</li>
              <li><strong>Post Data:</strong> Content of posts generated and published through our application.</li>
              <li><strong>Engagement Data:</strong> Likes, comments, shares, and reach for posts published through our app.</li>
              <li><strong>Usage Data:</strong> How you interact with our application, including features used and settings configured.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-2">We use the collected information to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Publish AI-generated posts to your Facebook Pages on your behalf.</li>
              <li>Track and display engagement metrics for your published content.</li>
              <li>Generate relevant trending content based on your preferences.</li>
              <li>Improve our AI content generation capabilities.</li>
              <li>Provide customer support and respond to your requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Facebook Data Usage</h2>
            <p className="text-gray-600 leading-relaxed">
              We access your Facebook data through the Facebook Graph API using the following permissions:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
              <li><strong>pages_manage_posts:</strong> To publish posts to your Facebook Pages.</li>
              <li><strong>pages_read_engagement:</strong> To read engagement metrics on your posts.</li>
              <li><strong>pages_show_list:</strong> To display a list of Facebook Pages you manage.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-2">
              We do not sell, share, or transfer your Facebook data to any third parties.
              We only use your Facebook data to provide the services described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Data Storage &amp; Security</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is stored securely using Supabase (a hosted PostgreSQL database) with encryption at rest.
              Facebook access tokens are stored server-side and are never exposed to client-side code.
              We implement industry-standard security measures to protect your data from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your data for as long as your account is active. You may request deletion of your data
              at any time by contacting us. Upon account deletion, we will remove all your personal data and
              Facebook tokens within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Data Deletion</h2>
            <p className="text-gray-600 leading-relaxed">
              You can request deletion of your data by:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
              <li>Removing the app from your Facebook account settings.</li>
              <li>Contacting us directly to request data deletion.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-2">
              When you remove MyNitrends from your Facebook account, we will automatically delete your
              Facebook tokens and associated data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed mb-2">We use the following third-party services:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Facebook / Meta:</strong> For social media publishing and authentication.</li>
              <li><strong>GROQ:</strong> For AI text generation (no personal data is sent).</li>
              <li><strong>Hugging Face:</strong> For AI text and image generation (no personal data is sent).</li>
              <li><strong>Supabase:</strong> For secure data storage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-2">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Withdraw consent for data processing at any time.</li>
              <li>Export your data in a portable format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your data rights,
              please contact us at: <a href="mailto:support@mynitrends.com" className="text-blue-600 hover:underline">support@mynitrends.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
