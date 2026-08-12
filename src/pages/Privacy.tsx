import { usePageMeta } from "../hooks/usePageMeta";

export default function Privacy() {
  usePageMeta({ title: "Privacy Policy", description: "Street Insights privacy policy. How we collect, use, and protect your data." });
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Legal</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-sm text-gray-500">Last updated: June 16, 2026</p>

      <div className="mt-12 space-y-8 text-gray-700 leading-relaxed">
        <p>Street Insights ("Street Insights," "we," "us," or "our"), a Boxford Partners LLC product, operates getstreetinsights.com. This Privacy Policy explains what information we collect, how we use it, and your rights with respect to it.</p>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data</strong> — email address and registration information collected during sign-up.</li>
            <li><strong>Watchlist data</strong> — stock tickers and alert preferences you configure within the platform.</li>
            <li><strong>Usage data</strong> — pages visited, features used, and interactions within the platform.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide, operate, and improve the Street Insights platform</li>
            <li>To deliver stock sentiment alerts and analysis</li>
            <li>To send transactional and account-related communications</li>
            <li>To comply with legal obligations</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Third-Party Service Providers</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — database and authentication infrastructure</li>
            <li><strong>xAI / Grok</strong> — AI-powered sentiment analysis features</li>
            <li><strong>Inngest</strong> — background job processing</li>
            <li><strong>Resend</strong> — email alert delivery</li>
            <li><strong>Vercel</strong> — hosting and infrastructure</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Cookies and Tracking</h2>
          <p>We use cookies and similar technologies to maintain sessions, remember preferences, and understand how visitors use our platform. You can disable cookies in your browser settings, though some features may not function correctly.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Data Retention</h2>
          <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us at the address below.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Rights</h2>
          <p>Depending on your location, you may have the right to access, correct, delete, or restrict processing of your personal data. California residents have additional rights under the CCPA, including the right to know what data we've collected and the right to opt out of any sale of personal information. We do not sell personal information.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Children's Privacy</h2>
          <p>Our services are not directed to individuals under 18. We do not knowingly collect personal information from minors.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Changes to This Policy</h2>
          <p>We may update this policy from time to time. Material changes will be noted with a new "Last updated" date. Continued use of our services after changes constitutes acceptance.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
          <p>Questions about this policy or requests related to your data:</p>
          <p className="mt-2">
            Street Insights / Boxford Partners LLC<br />
            <a href="mailto:hello@boxfordpartners.com" className="text-blue-600 hover:underline">hello@boxfordpartners.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
