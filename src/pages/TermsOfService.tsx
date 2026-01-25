import { Link } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, Scale, CreditCard, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Welcome to ChurchFlow. These Terms of Service ("Terms") govern your use of our church management platform. 
              By accessing or using ChurchFlow, you agree to be bound by these Terms. If you disagree with any part of 
              these terms, you may not access the service.
            </p>
          </section>

          {/* Acceptance */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">Acceptance of Terms</h2>
            </div>
            <p className="text-muted-foreground">
              By creating an account or using ChurchFlow, you confirm that you are at least 18 years old (or the age of 
              majority in your jurisdiction) and have the authority to enter into this agreement on behalf of yourself 
              or your church organization. Church administrators are responsible for ensuring that all users within 
              their organization comply with these Terms.
            </p>
          </section>

          {/* Service Description */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              ChurchFlow is a church management platform that provides:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>Member registration and profile management</li>
              <li>Attendance tracking and check-in systems</li>
              <li>Visitor management and follow-up tools</li>
              <li>Group and ministry organization</li>
              <li>SMS communication and broadcast messaging</li>
              <li>Analytics and reporting dashboards</li>
              <li>Multi-branch church management</li>
            </ul>
          </section>

          {/* Account Responsibilities */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">Account Responsibilities</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground">Church Administrators</h3>
                <ul className="space-y-1 mt-2">
                  <li>Are responsible for maintaining accurate church and member information</li>
                  <li>Must ensure proper consent is obtained before adding member data</li>
                  <li>Are responsible for managing admin access and permissions</li>
                  <li>Must comply with all applicable data protection laws</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground">All Users</h3>
                <ul className="space-y-1 mt-2">
                  <li>Must keep login credentials secure and confidential</li>
                  <li>Are responsible for all activities under their account</li>
                  <li>Must provide accurate and truthful information</li>
                  <li>Must notify us immediately of any unauthorized access</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="w-5 h-5 text-destructive" />
              <h2 className="text-xl font-semibold m-0">Prohibited Uses</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              You agree not to use ChurchFlow to:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>Send unsolicited SMS messages or spam</li>
              <li>Collect or store data for purposes other than church management</li>
              <li>Share member information with unauthorized third parties</li>
              <li>Attempt to access other churches' data or systems</li>
              <li>Upload malicious content or attempt to compromise security</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
            </ul>
          </section>

          {/* Subscription & Billing */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">Subscription & Billing</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground">Free Trial</h3>
                <p className="mt-1">
                  New churches receive a 14-day free trial with full access to all features. 
                  No payment information is required to start your trial.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Paid Subscriptions</h3>
                <p className="mt-1">
                  After the trial period, a paid subscription is required to continue using ChurchFlow. 
                  Pricing is based on the number of members and branches. Payments are processed securely 
                  through our payment partners.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">SMS Credits</h3>
                <p className="mt-1">
                  SMS messaging requires credits, which can be purchased separately. 
                  Unused credits do not expire as long as your subscription remains active.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Refunds</h3>
                <p className="mt-1">
                  Subscription fees are non-refundable except as required by law. 
                  Unused SMS credits may be refunded within 30 days of purchase on a case-by-case basis.
                </p>
              </div>
            </div>
          </section>

          {/* Data Ownership */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Data Ownership</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">Your Data:</strong> You retain all rights to your church data. 
                We do not claim ownership over any content you upload or create on ChurchFlow.
              </p>
              <p>
                <strong className="text-foreground">Our Platform:</strong> ChurchFlow, including its design, features, 
                and underlying technology, remains our intellectual property.
              </p>
              <p>
                <strong className="text-foreground">Data Export:</strong> You may export your data at any time 
                through the platform's export features.
              </p>
            </div>
          </section>

          {/* Service Availability */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. 
              We may perform scheduled maintenance with advance notice when possible. 
              We are not liable for any downtime or service interruptions.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-semibold m-0">Limitation of Liability</h2>
            </div>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, ChurchFlow shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including loss of data, revenue, or profits, 
              arising from your use of the service. Our total liability shall not exceed the amount you paid 
              for the service in the 12 months preceding the claim.
            </p>
          </section>

          {/* Termination */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Termination</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">By You:</strong> You may cancel your subscription at any time. 
                Your access will continue until the end of your current billing period.
              </p>
              <p>
                <strong className="text-foreground">By Us:</strong> We may suspend or terminate your account for 
                violation of these Terms, non-payment, or at our discretion with reasonable notice.
              </p>
              <p>
                <strong className="text-foreground">Effect of Termination:</strong> Upon termination, 
                your data will be retained for 90 days to allow for export, after which it will be permanently deleted.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify you of material changes 
              via email or through the platform. Continued use of ChurchFlow after changes constitutes 
              acceptance of the new Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of Ghana. 
              Any disputes arising from these Terms or your use of ChurchFlow shall be resolved 
              through arbitration in Accra, Ghana.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-primary/5 rounded-xl p-6 border border-primary/20">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <p className="text-foreground">
              <strong>Email:</strong>{" "}
              <a href="mailto:info@easychurchflow.com" className="text-primary hover:underline">
                info@easychurchflow.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
