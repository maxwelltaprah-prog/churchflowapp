import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, Mail, MessageCircle, Book, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/landing/Footer";

export default function Support() {
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
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Support</h1>
            <p className="text-muted-foreground">We're here to help you succeed</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Contact Options */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <CardTitle>Email Support</CardTitle>
                <CardDescription>Get help via email</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Send us an email and we'll respond within 24 hours.
                </p>
                <a 
                  href="mailto:info@easychurchflow.com" 
                  className="text-primary font-medium hover:underline"
                >
                  info@easychurchflow.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <CardTitle>Response Time</CardTitle>
                <CardDescription>What to expect</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Critical issues: Within 4 hours</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>General inquiries: Within 24 hours</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Feature requests: Within 48 hours</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Book className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Quick answers to common questions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">How do I add members to my church?</h3>
                <p className="text-muted-foreground text-sm">
                  Navigate to the Members section in your dashboard and click "Add Member". 
                  You can also share your branch join code for members to self-register.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">How do I check in members during a service?</h3>
                <p className="text-muted-foreground text-sm">
                  Create a service in the Services section, then use the Check-in page to scan member QR codes 
                  or search for members manually. You can also enable self-check-in via QR code.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">How do SMS credits work?</h3>
                <p className="text-muted-foreground text-sm">
                  Each SMS segment costs credits. Standard messages (up to 160 characters) use 1 credit. 
                  Longer messages are split into segments. You can purchase credits from the SMS dashboard.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Can I add multiple branches?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes! ChurchFlow supports multi-branch churches. Navigate to Branches in your dashboard 
                  to add new branches. Each branch can have its own admins and members.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">How do I export my data?</h3>
                <p className="text-muted-foreground text-sm">
                  You can export member data, attendance records, and other information from the 
                  respective pages in CSV format using the export button.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">What happens after my trial ends?</h3>
                <p className="text-muted-foreground text-sm">
                  After your 14-day trial, you'll need to subscribe to continue using ChurchFlow. 
                  Your data is preserved, but access will be limited until you subscribe.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Need More Help?</CardTitle>
                  <CardDescription>We're happy to assist</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you can't find the answer you're looking for, don't hesitate to reach out. 
                Our support team is dedicated to helping churches succeed with ChurchFlow.
              </p>
              <Button asChild>
                <a href="mailto:info@easychurchflow.com">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
