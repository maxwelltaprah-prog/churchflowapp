import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqCategories = [
  {
    title: "Pricing & Trial",
    faqs: [
      {
        question: "How does the trial work?",
        answer: "We offer a 1-month free trial with full access to all features—no payment required. During this period, we'd love your feedback at info@easychurchflow.com. After your 1-month trial ends, you'll get an additional 14-day free trial before billing begins."
      },
      {
        question: "When does billing start?",
        answer: "Billing only starts after your 1-month feedback trial AND the 14-day free trial have both ended. That's over 6 weeks of free access! We'll notify you before any charges apply."
      },
      {
        question: "How do I provide feedback during the trial?",
        answer: "Simply email us at info@easychurchflow.com with your thoughts, suggestions, or questions. We actively review all feedback to improve the platform for churches like yours."
      },
      {
        question: "What happens after the trial?",
        answer: "After your 1-month trial, you automatically enter a 14-day free trial. If you choose to subscribe, pricing is based on your member count: GHS 99/month for up to 150 members, GHS 299/month for up to 5,000 members, and GHS 599/month for larger congregations. Additional branches are GHS 100/month each."
      }
    ]
  },
  {
    title: "Overview",
    faqs: [
      {
        question: "What is EasyChurchFlow?",
        answer: "EasyChurchFlow is a church attendance and member engagement platform designed to help churches manage service check-ins, track attendance, and gain insights into participation across all branches."
      },
      {
        question: "Who should use EasyChurchFlow?",
        answer: "EasyChurchFlow is intended for church administrators, pastors and ministry leaders, ushers and service volunteers, and office staff responsible for visitor follow-up. Anyone involved in managing attendance, tracking engagement, or supporting members can benefit."
      },
      {
        question: "Why use EasyChurchFlow?",
        answer: "EasyChurchFlow simplifies the process of tracking attendance and engaging your congregation. It centralizes visitor and member check-ins, provides real-time analytics on engagement, and supports growth in church participation."
      }
    ]
  },
  {
    title: "Accounts & Access",
    faqs: [
      {
        question: "How do I log in?",
        answer: "You log in with your assigned email address and password. If your church network has multiple branches, and you are assigned to more than one, you will be prompted to select the specific church branch you want to manage for that session."
      },
      {
        question: "How do I become an admin?",
        answer: "Only existing administrators or superadmins can promote a member to admin status. When making someone an admin, they must first be a registered member in the system. You search the members list, select the person, assign a password, and configure their access permissions."
      },
      {
        question: "What permissions can be assigned?",
        answer: "When creating or editing an admin, you can specify which menu options the admin can access and which church branches the admin can manage. You can also choose \"Select All\" to grant full access within the configured scope."
      }
    ]
  },
  {
    title: "Visitors & Members",
    faqs: [
      {
        question: "What is the difference between a visitor and a member?",
        answer: "A visitor is someone attending your church who is not yet registered as a full member. A member has completed the registration process and is part of your church database."
      },
      {
        question: "How are visitors registered?",
        answer: "Visitors can be added manually by an admin through the \"Add New Visitor\" form. This captures full biographical information similar to the member form, including how the visitor heard about your church."
      },
      {
        question: "How do visitors check in?",
        answer: "Visitors can check in using a church-generated QR code scanned with their smartphone and providing a phone number, or through a manual check-in where an usher or admin enters their phone number directly. Successful check-ins are recorded in the system."
      }
    ]
  },
  {
    title: "Check-in & Attendance",
    faqs: [
      {
        question: "How does QR check-in work?",
        answer: "Each church service or location generates a unique QR code. A visitor scans this QR code using their phone and enters their phone number to register their attendance. This process is quick and contactless."
      },
      {
        question: "How does manual check-in work?",
        answer: "An usher or admin can manually check in a visitor by entering the visitor's phone number into the system when the visitor does not have a smartphone or is unable to scan the QR code."
      },
      {
        question: "What is attendance tracking?",
        answer: "Attendance tracking records who attends your church services and when. This can be used to analyze engagement trends and support pastoral care decisions."
      }
    ]
  },
  {
    title: "Dashboards & Analytics",
    faqs: [
      {
        question: "What can I see on the dashboard?",
        answer: "Dashboards provide a snapshot of new visitors, returning visitors, and attendance trends over time. These analytics help you understand participation patterns and engagement in your congregation."
      },
      {
        question: "What are engagement signals?",
        answer: "Engagement signals highlight who consistently misses services, who may have drifted away, and who recently returned after missing services. These insights help you reach out pastorally."
      }
    ]
  },
  {
    title: "Follow-Up & Communication",
    faqs: [
      {
        question: "What is follow-up?",
        answer: "Follow-up is any action you take to engage with visitors or members after they have attended a service. This could be a phone call, SMS message, or personal visit."
      },
      {
        question: "How are SMS communications managed?",
        answer: "You can send bulk SMS to members and visitors through the built-in communication tools. SMS can be personalized and sent to selected groups or individuals depending on your needs."
      }
    ]
  },
  {
    title: "Files & Resources",
    faqs: [
      {
        question: "Can I upload service documents?",
        answer: "Yes. Admins can upload church programs (PDF or images) and sermon audio (MP3 up to 50MB) for specific services."
      },
      {
        question: "When can members download these files?",
        answer: "After a member successfully checks in to a service, they are redirected to a page where they can download available files for that service. If they do not download immediately, these files remain available in their member portal for a limited time (typically 48 hours after upload)."
      }
    ]
  }
];

export function FAQSection() {
  return (
    <section className="py-20 px-4 bg-muted/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Got Questions?
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to know about EasyChurchFlow. Can't find the answer you're looking for? 
            Reach out to our support team.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                {category.title}
              </h3>
              <Accordion type="single" collapsible className="w-full">
                {category.faqs.map((faq, faqIndex) => (
                  <AccordionItem 
                    key={faqIndex} 
                    value={`${categoryIndex}-${faqIndex}`}
                    className="border-border/50"
                  >
                    <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
