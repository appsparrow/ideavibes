import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Camera, Tag, Briefcase, Users } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';

interface EnhancedProfile {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_photo_url?: string;
  bio?: string;
  expertise_tags?: string[];
  skills?: string[];
  investor_type?: string;
  role?: string;
  subscription_tier?: string | null;
  subscription_expires_at?: string | null;
  organization_id?: string | null;
  organization?: {
    id: string;
    name: string;
    type: 'organization' | 'individual';
  } | null;
  organization_role?: string;
}

function EnhancedProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EnhancedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newExpertise, setNewExpertise] = useState('');
  const [userGroups, setUserGroups] = useState<Array<{id: string, name: string, role: string}>>([]);
  const [organizationName, setOrganizationName] = useState('BeyondIt');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserGroups();
      fetchOrganizationInfo();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Use simple profile query to avoid database relationship errors
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Transform the data to match our interface with hardcoded BeyondIT organization
      const profileData = data ? {
        ...data,
        organization: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'BeyondIT',
          type: 'organization' as const
        },
        organization_role: data.role === 'admin' ? 'admin' : 'member'
      } : null;
      
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          groups!inner(
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const groups = data?.map(item => ({
        id: item.groups.id,
        name: item.groups.name,
        role: item.role
      })) || [];

      setUserGroups(groups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      // Don't show error toast for groups as it's not critical
    }
  };

  const fetchOrganizationInfo = async () => {
    if (!user) return;

    try {
      console.log('Fetching organization info for user:', user.id);
      
      // Get user's organization from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, account_type')
        .eq('id', user.id)
        .single();
      
      console.log('Profile data:', profileData);
      
      if (profileData?.organization_id) {
        // User has an organization, fetch its details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', profileData.organization_id)
          .single();
        
        if (orgData) {
          setOrganizationId(orgData.id);
          setOrganizationName(orgData.name);
          console.log('Set organization:', orgData.name);
        } else {
          console.log('Organization not found, user is independent');
          setOrganizationId(null);
          setOrganizationName('No Organization');
        }
      } else {
        // User is independent (no organization)
        console.log('User is independent (no organization)');
        setOrganizationId(null);
        setOrganizationName('Independent User');
      }
      
    } catch (error) {
      console.error('Error fetching organization info:', error);
      // Fallback for independent users
      setOrganizationName('Independent User');
      setOrganizationId(null);
      console.log('Fallback to independent user');
    }
  };

  const updateOrganizationName = async () => {
    if (!user || !organizationId || profile?.role !== 'admin') {
      console.log('Update blocked:', { user: !!user, organizationId, role: profile?.role });
      return;
    }

    try {
      console.log('Updating organization:', { id: organizationId, name: organizationName });
      
      const { data, error } = await supabase
        .from('organizations')
        .update({ 
          name: organizationName,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)
        .select();

      console.log('Update result:', { data, error });

      if (error) throw error;

      toast.success('Organization name updated successfully');
      
      // Refresh organization info to confirm the update
      await fetchOrganizationInfo();
    } catch (error) {
      console.error('Error updating organization name:', error);
      toast.error('Failed to update organization name. Please run the RLS fix SQL script.');
    }
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          bio: profile.bio,
          expertise_tags: profile.expertise_tags,
          skills: profile.skills,
          profile_photo_url: profile.profile_photo_url
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim() || !profile) return;
    
    const currentSkills = profile.skills || [];
    if (!currentSkills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...currentSkills, newSkill.trim()]
      });
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: (profile.skills || []).filter(skill => skill !== skillToRemove)
    });
  };

  const addExpertise = () => {
    if (!newExpertise.trim() || !profile) return;
    
    const currentExpertise = profile.expertise_tags || [];
    if (!currentExpertise.includes(newExpertise.trim())) {
      setProfile({
        ...profile,
        expertise_tags: [...currentExpertise, newExpertise.trim()]
      });
    }
    setNewExpertise('');
  };

  const removeExpertise = (expertiseToRemove: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      expertise_tags: (profile.expertise_tags || []).filter(exp => exp !== expertiseToRemove)
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
            <p className="text-muted-foreground">Unable to load your profile information.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Profile Header Section */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.profile_photo_url} />
                  <AvatarFallback className="text-lg">
                    {((profile.first_name || profile.name || 'U').charAt(0) +
                      (profile.last_name || '').charAt(0)).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.first_name && profile.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : profile.name || 'User Profile'
                    }
                  </h1>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {profile.role || 'member'}
                </Badge>
                {profile.subscription_tier === 'pro' && 
                 (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date()) && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                    PRO
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={updateProfile} disabled={saving} className="ml-4">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Photo & Basic Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.profile_photo_url} />
                  <AvatarFallback className="text-2xl">
                    {((profile.first_name || profile.name || 'U').charAt(0) +
                      (profile.last_name || '').charAt(0)).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full space-y-2">
                  <Label htmlFor="photo-url">Photo URL</Label>
                  <Input
                    id="photo-url"
                    placeholder="https://example.com/photo.jpg"
                    value={profile.profile_photo_url || ''}
                    onChange={(e) => setProfile({...profile, profile_photo_url: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personal Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={profile.first_name || ''}
                    onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={profile.last_name || ''}
                    onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio / Short Description</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Group Memberships - View Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Memberships
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your group memberships and roles. To edit group details, go to the Groups page.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {userGroups.length > 0 ? (
            <div className="space-y-3">
              {userGroups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-muted-foreground">Group Member</p>
                  </div>
                  <Badge variant={group.role === 'admin' ? 'default' : 'outline'}>
                    {group.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No group memberships</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expertise Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Business Expertise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(profile.expertise_tags || []).map((expertise, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {expertise}
                  <button
                    onClick={() => removeExpertise(expertise)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {(profile.expertise_tags?.length || 0) === 0 && (
                <p className="text-muted-foreground">No expertise tags added yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add expertise area..."
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
              />
              <Button onClick={addExpertise} disabled={!newExpertise.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Skills & Competencies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(profile.skills || []).map((skill, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {(profile.skills?.length || 0) === 0 && (
                <p className="text-muted-foreground">No skills added yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              />
              <Button onClick={addSkill} disabled={!newSkill.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Information */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Role</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {profile.role || 'member'}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Your role determines what you can access and manage in the platform
              </p>
            </div>
          </div>
          
          {/* Organization Information */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-muted-foreground">Organization</Label>
            <div className="mt-2 space-y-3">
              {organizationId ? (
                // User has an organization
                profile.role === 'admin' ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="org-name">Organization Name</Label>
                      <div className="flex gap-2">
                        <Input
                          id="org-name"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="Enter organization name"
                          className="flex-1"
                        />
                        <Button 
                          onClick={updateOrganizationName}
                          size="sm"
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        Organization Admin
                      </Badge>
                      <p className="text-xs text-green-600">
                        ✓ As an admin, you can edit organization details
                      </p>
                      <Button 
                        onClick={fetchOrganizationInfo}
                        size="sm"
                        variant="outline"
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        Organization Member
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {organizationName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Organization details can only be edited by administrators
                    </p>
                  </div>
                )
              ) : (
                // User is independent (no organization)
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      Independent User
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    You're not part of any organization yet
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      You can:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Create and join groups independently</li>
                      <li>• Upgrade to organization admin for team features</li>
                      <li>• Join an existing organization with an invite code</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}

export default EnhancedProfile;