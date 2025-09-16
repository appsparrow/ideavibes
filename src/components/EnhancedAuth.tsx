import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, User, Building, Users } from 'lucide-react';

type AccountType = 'individual' | 'organization' | 'join';

const EnhancedAuth = () => {
  const [currentStep, setCurrentStep] = useState<'basic' | 'type' | 'details'>('basic');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  
  // Basic info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Organization details
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState<'organization' | 'individual'>('organization');
  
  // Join organization
  const [inviteCode, setInviteCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Prepare metadata for signup
      const metadata: any = {
        first_name: firstName,
        last_name: lastName,
        account_type: accountType
      };
      
      // Add organization details if needed
      if (accountType === 'organization') {
        metadata.organization_name = organizationName;
        metadata.organization_type = organizationType;
      } else if (accountType === 'join') {
        metadata.invite_code = inviteCode;
      }
      
      // Create user account with metadata
      const { error: authError } = await signUp(email, password, metadata);
      
      if (authError) throw authError;
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      
      navigate('/');
      
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };


  const nextStep = () => {
    if (currentStep === 'basic') {
      setCurrentStep('type');
    } else if (currentStep === 'type') {
      setCurrentStep('details');
    }
  };

  const prevStep = () => {
    if (currentStep === 'details') {
      setCurrentStep('type');
    } else if (currentStep === 'type') {
      setCurrentStep('basic');
    }
  };

  const canProceed = () => {
    if (currentStep === 'basic') {
      return email && password && firstName && lastName;
    } else if (currentStep === 'type') {
      return accountType !== null;
    } else if (currentStep === 'details') {
      if (accountType === 'organization') {
        return organizationName.trim();
      } else if (accountType === 'join') {
        return inviteCode.trim();
      }
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to IdeaFlow
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose your account type to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {currentStep === 'basic' && 'Create Account'}
              {currentStep === 'type' && 'Choose Account Type'}
              {currentStep === 'details' && 'Complete Setup'}
            </CardTitle>
            <CardDescription className="text-center">
              {currentStep === 'basic' && 'Enter your basic information'}
              {currentStep === 'type' && 'Select how you want to use IdeaFlow'}
              {currentStep === 'details' && 'Provide additional details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                {currentStep === 'basic' && (
                  <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input
                          id="first-name"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input
                          id="last-name"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!canProceed()}>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                )}

                {currentStep === 'type' && (
                  <div className="space-y-6">
                    <RadioGroup value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="individual" id="individual" />
                          <div className="flex-1">
                            <Label htmlFor="individual" className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                <span className="font-medium">Individual User</span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Free</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Use IdeaFlow independently. Create and manage your own ideas and groups.
                              </p>
                            </Label>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="organization" id="organization" />
                          <div className="flex-1">
                            <Label htmlFor="organization" className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                <span className="font-medium">Organization Admin</span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Pro</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Create and manage your organization. Full features and team collaboration.
                              </p>
                            </Label>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="join" id="join" />
                          <div className="flex-1">
                            <Label htmlFor="join" className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <span className="font-medium">Join Organization</span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Free</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Join an existing organization using an invite code.
                              </p>
                            </Label>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button type="button" onClick={nextStep} disabled={!canProceed()} className="flex-1">
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'details' && (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {accountType === 'organization' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="org-name">Organization Name</Label>
                          <Input
                            id="org-name"
                            placeholder="Acme Corporation"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Organization Type</Label>
                          <RadioGroup value={organizationType} onValueChange={(value) => setOrganizationType(value as 'organization' | 'individual')}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="organization" id="org-type-org" />
                              <Label htmlFor="org-type-org">Organization</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="individual" id="org-type-ind" />
                              <Label htmlFor="org-type-ind">Individual</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    )}

                    {accountType === 'join' && (
                      <div className="space-y-2">
                        <Label htmlFor="invite-code">Invite Code</Label>
                        <Input
                          id="invite-code"
                          placeholder="Enter organization invite code"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          required
                        />
                        <p className="text-xs text-gray-600">
                          Get this code from your organization admin
                        </p>
                      </div>
                    )}

                    {accountType === 'individual' && (
                      <div className="text-center py-4">
                        <p className="text-gray-600">
                          You're all set! You'll be able to create and join groups independently.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading || !canProceed()}>
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedAuth;
