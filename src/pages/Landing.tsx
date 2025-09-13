import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Clock, 
  Users, 
  CheckCircle, 
  MessageSquare, 
  FileText, 
  Zap, 
  Star,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  const features = [
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Real-time Collaborative Notes",
      description: "Multiple participants can add notes simultaneously during meetings",
      timeSaved: "15 min/meeting"
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "AI-Powered Summaries",
      description: "Automatically generate structured summaries from all meeting notes",
      timeSaved: "20 min/meeting"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Action Item Tracking",
      description: "Never lose track of decisions and next steps",
      timeSaved: "10 min/meeting"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Rich Text Documents",
      description: "Format notes with rich text, copy-paste anywhere",
      timeSaved: "5 min/meeting"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Meeting Feedback",
      description: "Collect honest feedback to improve future meetings",
      timeSaved: "Priceless insights"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Meeting Management",
      description: "Schedule, organize, and track all your group meetings",
      timeSaved: "30 min/week"
    }
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for small groups",
      features: [
        "Up to 5 members",
        "3 meetings per month",
        "Basic notes & summaries",
        "2 AI summaries per month",
        "Community support"
      ],
      cta: "Start Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$12",
      period: "per month",
      description: "For growing communities",
      features: [
        "Up to 50 members",
        "Unlimited meetings",
        "AI summary for every meeting",
        "Rich text editing",
        "Meeting feedback surveys",
        "Export capabilities"
      ],
      cta: "Start Pro Trial",
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="IdeaFlow" 
            className="h-16 w-16 md:h-20 md:w-20"
          />
        </div>
        
        <Badge className="mb-4" variant="secondary">
          <Zap className="h-3 w-3 mr-1" />
          Save 50+ minutes per meeting
        </Badge>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Turn Chaotic Meetings Into 
          <br />Organized Action
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
          AI-powered collaborative notes, instant summaries, and actionable insights. 
          Stop wasting time collecting scattered thoughts—focus on what matters.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button asChild size="lg" className="text-lg px-8 py-4">
            <Link to="/auth">
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4">
            <Link to="#demo">
              See Demo
            </Link>
          </Button>
        </div>

        <div className="text-center text-gray-500">
          <p>✨ No credit card required • ⚡ Setup in 60 seconds • 🔒 Privacy-first</p>
        </div>
      </header>

      {/* Time Savings Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The Hidden Cost of Disorganized Meetings
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Every meeting without proper coordination costs you valuable time and insights
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">❌ Without IdeaVibes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-red-600">
              <p>• 15 min collecting scattered notes from participants</p>
              <p>• 20 min manually consolidating and organizing</p>
              <p>• 10 min tracking down action items</p>
              <p>• 30 min following up on decisions</p>
              <p>• Lost insights from poor documentation</p>
              <div className="pt-4 border-t border-red-200">
                <p className="font-bold text-lg">Total: 75+ minutes wasted per meeting</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-700">✅ With IdeaVibes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-green-600">
              <p>• Real-time collaborative note-taking during meeting</p>
              <p>• Instant AI summary generation</p>
              <p>• Automatic action item tracking</p>
              <p>• Rich text formatting for easy sharing</p>
              <p>• Anonymous feedback for continuous improvement</p>
              <div className="pt-4 border-t border-green-200">
                <p className="font-bold text-lg">Total: 5 minutes post-meeting</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need for Productive Meetings
          </h2>
          <p className="text-xl text-gray-600">
            Designed by meeting facilitators, for meeting facilitators
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {feature.timeSaved}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Start free, scale as you grow
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-lg font-normal text-gray-500">/{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                >
                  <Link to="/auth">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Meetings?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of teams already saving hours every week
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-4">
            <Link to="/auth">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 opacity-75">
            Free forever plan • No setup fees • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
