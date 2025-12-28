export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-background pb-24">
            <div className="container max-w-4xl mx-auto p-6 py-12">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            
                    <div className="space-y-6 text-gray-700">
                        <p>
                            SaqlainiApp (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. 
                            This Privacy Policy explains how we collect, use, and safeguard your personal information when you use 
                            our mobile application, SaqlainiApp, available on the Google Play Store. By using our app, you agree 
                            to the terms outlined in this policy.
                        </p>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
                            <p className="mb-2">We may collect the following types of information to provide you with the best experience:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>Personal Information:</strong> This includes information you provide directly, such as 
                                    your name, email address, phone number, and other account details.
                                </li>
                                <li>
                                    <strong>Usage Data:</strong> Information about how you interact with the app, including your 
                                    IP address, device type, operating system, app version, and time spent in the app.
                                </li>
                                <li>
                                    <strong>Location Data:</strong> With your permission, we may collect location information to 
                                    enhance app features and improve user experience.
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
                            <p className="mb-2">We use the information collected for several purposes, including:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>To operate and improve our app&apos;s functionality and user experience.</li>
                                <li>To customize the content displayed in the app.</li>
                                <li>To communicate with you for app updates, support, and notifications.</li>
                                <li>To ensure security and prevent fraudulent use of the app.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">3. Sharing and Disclosure of Information</h2>
                            <p className="mb-2">
                                Your personal information is not sold, rented, or traded to third parties. We may share information 
                                only in these circumstances:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>Service Providers:</strong> With trusted service providers who assist in app functionality 
                                    and maintenance.
                                </li>
                                <li>
                                    <strong>Legal Requirements:</strong> If required by law, court orders, or to protect our rights, 
                                    safety, or property.
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">4. Data Security</h2>
                            <p>
                                We take reasonable security measures to protect your information. However, please note that no method 
                                of electronic transmission or storage is 100% secure, and we cannot guarantee its absolute security.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">5. Your Rights</h2>
                            <p>
                                You may have the right to access, update, or delete your personal information within the app settings 
                                or by contacting us. Based on your jurisdiction, you may also have additional rights, including the 
                                right to restrict processing or data portability.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">6. Children&apos;s Privacy</h2>
                            <p>
                                SaqlainiApp is not intended for users under the age of 13. We do not knowingly collect personal 
                                information from children under 13. If we learn that we have inadvertently collected such data, 
                                we will delete it promptly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">7. Changes to This Privacy Policy</h2>
                            <p>
                                We may update this Privacy Policy periodically. Any changes will be posted here, and you are advised 
                                to review this page regularly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-3">8. Contact Us</h2>
                            <p>
                                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
                            </p>
                            <p className="mt-2">
                                <strong>Email:</strong> <a href="mailto:theujairo@gmail.com" className="text-blue-600 hover:underline">theujairo@gmail.com</a>
                            </p>
                        </section>

                        <p className="text-sm text-gray-500 mt-8">
                            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
