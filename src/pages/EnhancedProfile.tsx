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
import { User, Phone, Mail, Camera, Tag, Briefcase } from 'lucide-react';
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
}

function EnhancedProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EnhancedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newExpertise, setNewExpertise] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
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
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Enhanced Profile</h1>
          {profile.subscription_tier === 'pro' && 
           (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date()) && (
            <Badge className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
              PRO
            </Badge>
          )}
        </div>
        <Button onClick={updateProfile} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
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
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Role</Label>
            <p className="capitalize">{profile.role || 'member'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Investor Type</Label>
            <p className="capitalize">{profile.investor_type || 'passive'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EnhancedProfile;