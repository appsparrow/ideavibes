import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Zap, Users, Bot, BarChart3 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';

interface UserProfile {
  subscription_tier: string | null;
  subscription_expires_at: string | null;
}

const Billing = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your team's needs. Upgrade anytime to unlock powerful collaboration features.
          </p>
        </div>

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

        {/* Feature Comparison */}
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Feature Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Feature</th>
                      <th className="text-center py-2">Free</th>
                      <th className="text-center py-2">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    <tr className="border-b">
                      <td className="py-3">Members</td>
                      <td className="text-center">Up to 5</td>
                      <td className="text-center">Up to 50</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">Meetings per Month</td>
                      <td className="text-center">3</td>
                      <td className="text-center">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">AI Summaries per Month</td>
                      <td className="text-center">2</td>
                      <td className="text-center">Every meeting</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">Meeting Feedback</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">Rich Text Editing</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold">Need a custom plan?</h3>
          <p className="text-muted-foreground">
            For enterprise customers or teams with special requirements, contact our sales team.
          </p>
          <Button variant="outline">Contact Sales</Button>
        </div>
      </div>
    </Layout>
  );
};

export default Billing;
