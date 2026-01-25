import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database, Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/Footer";

export default function PrivacyPolicy() {
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
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-lg text-muted-foreground leading-relaxed">
              At ChurchFlow, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
              church management platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">Information We Collect</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground">Personal Information</h3>
                <ul className="text-muted-foreground space-y-1 mt-2">
                  <li>Full name and contact details (phone number, email address)</li>
                  <li>Date of birth and gender</li>
                  <li>Residential address and area/zone information</li>
                  <li>Emergency contact information</li>
                  <li>Profile photos (optional)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Church-Related Information</h3>
                <ul className="text-muted-foreground space-y-1 mt-2">
                  <li>Church membership details and status</li>
                  <li>Group and ministry affiliations</li>
                  <li>Attendance records and check-in history</li>
                  <li>Spiritual journey milestones</li>
                  <li>Visitor information and follow-up notes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Technical Information</h3>
                <ul className="text-muted-foreground space-y-1 mt-2">
                  <li>Device information and browser type</li>
                  <li>IP address and location data</li>
                  <li>Usage patterns and feature interactions</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">How We Use Your Information</h2>
            </div>
            <ul className="text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Service Provision:</strong> To provide and maintain our church management services</li>
              <li><strong className="text-foreground">Communication:</strong> To send SMS notifications, service reminders, and important updates</li>
              <li><strong className="text-foreground">Member Care:</strong> To enable churches to follow up with members and visitors</li>
              <li><strong className="text-foreground">Analytics:</strong> To provide attendance insights and engagement analytics to church administrators</li>
              <li><strong className="text-foreground">Improvement:</strong> To enhance our services and develop new features</li>
              <li><strong className="text-foreground">Security:</strong> To protect against unauthorized access and ensure platform security</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">Data Sharing & Disclosure</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              We do not sell your personal information. We may share your data in the following circumstances:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li><strong className="text-foreground">With Your Church:</strong> Member data is accessible to authorized church administrators within your church organization</li>
              <li><strong className="text-foreground">Service Providers:</strong> We work with trusted third-party services for SMS delivery, payment processing, and cloud infrastructure</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our rights and the safety of users</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">Data Security</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              We implement robust security measures to protect your information:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>End-to-end encryption for data transmission</li>
              <li>Secure authentication with PIN protection for member portals</li>
              <li>Row-level security ensuring data isolation between churches</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Secure cloud infrastructure with automatic backups</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate information</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data (subject to legal obligations)</li>
              <li><strong className="text-foreground">Portability:</strong> Request transfer of your data in a portable format</li>
              <li><strong className="text-foreground">Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal information for as long as your account is active or as needed to provide services. 
              Church administrators may delete member records at any time. When a church account is closed, 
              all associated data is permanently deleted within 90 days.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Children's Privacy</h2>
            <p className="text-muted-foreground">
              ChurchFlow is designed for use by churches to manage their congregation data, including information about minors. 
              We rely on churches and parents/guardians to provide appropriate consent for the collection of children's information. 
              Church administrators are responsible for ensuring compliance with applicable laws regarding children's data.
            </p>
          </section>

          {/* Updates to Policy */}
          <section className="bg-muted/30 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by 
              posting the new policy on this page and updating the "Last updated" date. We encourage you to review 
              this policy periodically.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-primary/5 rounded-xl p-6 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold m-0">Contact Us</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="space-y-2">
              <p className="text-foreground">
                <strong>Email:</strong>{" "}
                <a href="mailto:info@easychurchflow.com" className="text-primary hover:underline">
                  info@easychurchflow.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
