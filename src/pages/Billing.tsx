import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Zap, Users, Bot, BarChart3, Clock, DollarSign, Coffee, Calculator } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

interface UserProfile {
  subscription_tier: string | null;
  subscription_expires_at: string | null;
}

const Billing = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Calculator State
  const [selectedFrequency, setSelectedFrequency] = useState('weekly');
  const [selectedTeamSize, setSelectedTeamSize] = useState('small');
  
  const frequencies = {
    daily: { label: 'Daily', multiplier: 30 },
    weekly: { label: 'Weekly', multiplier: 4 },
    monthly: { label: 'Monthly', multiplier: 1 }
  };
  
  const teamSizes = {
    small: { label: 'Small Team', attendees: 6, description: '2-10 people' },
    large: { label: 'Large Team', attendees: 18, description: '10-25 people' }
  };

  // Calculate savings based on selected frequency and team size
  const calculateSavings = () => {
    const frequency = frequencies[selectedFrequency as keyof typeof frequencies];
    const teamSize = teamSizes[selectedTeamSize as keyof typeof teamSizes];
    
    const meetingsPerMonth = frequency.multiplier;
    const averageAttendance = teamSize.attendees;
    
    // Base time savings per meeting (minutes)
    const noteTakingTime = 15; // minutes per attendee
    const followUpTime = 30; // minutes for organizer
    const communicationTime = 18; // minutes for organizer
    const ideaCaptureTime = 15; // minutes for organizer
    
    // Total overhead time per meeting
    const overheadPerMeeting = (noteTakingTime * averageAttendance) + followUpTime + communicationTime + ideaCaptureTime;
    
    // Monthly time spent (in hours)
    const monthlyTimeHours = (overheadPerMeeting * meetingsPerMonth) / 60;
    
    // IdeaFlow saves 90% of this time
    const hoursSaved = Math.round(monthlyTimeHours * 0.9 * 10) / 10;
    
    return {
      hoursSaved,
      meetingsPerMonth,
      averageAttendance,
      frequencyLabel: frequency.label,
      teamSizeLabel: teamSize.label,
      teamSizeDescription: teamSize.description
    };
  };

  const savings = calculateSavings();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_expires_at')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for small groups',
      features: [
        'Up to 5 members',
        '3 meetings per month',
        'Basic notes & summaries',
        '2 AI summaries per month',
        'Community support'
      ],
      limitations: [
        'No meeting feedback',
        'No advanced analytics',
        'Limited AI features'
      ],
      current: profile?.subscription_tier === null || profile?.subscription_tier === 'free',
      popular: false,
      cta: 'Current Plan'
    },
    {
      name: 'Pro',
      price: '$12',
      period: 'per month',
      description: 'For growing communities',
      features: [
        'Up to 50 members',
        'Unlimited meetings',
        'AI summary for every meeting',
        'Rich text editing',
        'Meeting feedback surveys',
        'Export capabilities'
      ],
      limitations: [],
      current: profile?.subscription_tier === 'pro',
      popular: true,
      cta: profile?.subscription_tier === 'pro' ? 'Manage Subscription' : 'Start Pro Trial'
    }
  ];

  const handleUpgrade = async (planName: string) => {
    if (planName === 'Pro') {
      // Simulate Stripe checkout - in real app this would redirect to Stripe
      const confirmed = window.confirm(
        'Simulate Pro subscription upgrade?\n\n' +
        'In production, this would redirect to Stripe checkout.\n' +
        'For testing, this will directly upgrade your account.'
      );
      
      if (confirmed) {
        try {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          
          const { error } = await supabase
            .from('profiles')
            .update({
              subscription_tier: 'pro',
              subscription_expires_at: expiresAt
            })
            .eq('id', user?.id);
          
          if (error) {
            console.error('Subscription update error:', error);
            throw new Error(`Database error: ${error.message}. Please run the database updates first.`);
          }
          
          toast.success('🎉 Upgraded to Pro! Subscription active for 30 days.');
          
          // Refresh profile data
          setProfile({
            subscription_tier: 'pro',
            subscription_expires_at: expiresAt
          });
        } catch (error) {
          console.error('Error upgrading subscription:', error);
          toast.error('Failed to upgrade subscription');
        }
      }
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Cancel Pro subscription?\n\n' +
      'In production, this would cancel via Stripe.\n' +
      'For testing, this will downgrade your account to Free.'
    );
    
    if (confirmed) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_tier: null,
            subscription_expires_at: null
          })
          .eq('id', user?.id);
        
        if (error) throw error;
        
        toast.success('Subscription cancelled. Downgraded to Free plan.');
        
        // Refresh profile data
        setProfile({
          subscription_tier: null,
          subscription_expires_at: null
        });
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        toast.error('Failed to cancel subscription');
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <PageHeader
          title="Billing & Plans"
          subtitle="Choose the plan that fits your team's needs. Upgrade anytime to unlock powerful collaboration features."
          className="text-center"
        />

        {/* Current Subscription Status */}
        {profile && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">
                    {profile.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                  </p>
                  {profile.subscription_expires_at && (
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(profile.subscription_expires_at).toLocaleDateString()}
                    </p>
                  )}
                  {!profile.subscription_tier && (
                    <p className="text-sm text-muted-foreground">
                      Forever free plan
                    </p>
                  )}
                </div>
                <Badge variant={profile.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                  {profile.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                </Badge>
              </div>
              
              {/* Management Actions */}
              <div className="flex gap-2">
                {profile.subscription_tier === 'pro' ? (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleCancelSubscription}
                    className="flex-1"
                  >
                    Cancel Subscription
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleUpgrade('Pro')} 
                    size="sm"
                    className="flex-1"
                  >
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                  {plan.current && (
                    <Badge variant="outline">Current</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Features
                  </h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.limitations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-muted-foreground">Not included:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  variant={plan.current ? "outline" : (plan.popular ? "default" : "outline")}
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={plan.current && plan.name === 'Free'}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        

        {/* Time Savings Calculator */}
        <Card className="max-w-2xl mx-auto border border-gray-200">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-gray-900">
              <Zap className="h-5 w-5 text-gray-600" />
              Time Savings Calculator
            </CardTitle>
            <CardDescription className="text-gray-600">
              See how many hours IdeaFlow can save your team each month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Frequency Selection */}
            <div className="space-y-4">
              <h4 className="text-center font-medium text-gray-700">Meeting frequency:</h4>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {Object.entries(frequencies).map(([key, frequency]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFrequency(key)}
                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedFrequency === key
                        ? 'bg-gray-900 text-white shadow-lg transform scale-105'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">{frequency.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Team Size Selection */}
            <div className="space-y-4">
              <h4 className="text-center font-medium text-gray-700">Team size:</h4>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {Object.entries(teamSizes).map(([key, teamSize]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTeamSize(key)}
                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedTeamSize === key
                        ? 'bg-gray-900 text-white shadow-lg transform scale-105'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">{teamSize.label}</div>
                    <div className="text-xs opacity-80">{teamSize.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="text-center space-y-4">
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {savings.hoursSaved} hours
                </div>
                <div className="text-lg text-gray-600 mb-1">saved per month</div>
                <div className="text-sm text-gray-500">
                  {savings.frequencyLabel} meetings × {savings.averageAttendance} attendees
                </div>
              </div>

              {/* Coffee Comparison */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-800">
                  <Coffee className="h-5 w-5 text-gray-600" />
                  <span>For the price of 2 cups of coffee</span>
                  <Coffee className="h-5 w-5 text-gray-600" />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  You save {savings.hoursSaved} hours worth way more than $12!
                </p>
              </div>

              {/* Value Proposition */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-lg font-semibold text-gray-800 mb-1">
                  That's {Math.round(savings.hoursSaved * 12)} hours per year!
                </div>
                <p className="text-sm text-gray-600">
                  Focus on what matters instead of meeting overhead
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Billing;
