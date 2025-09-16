# 🏢 Multi-Tenant Architecture Implementation Guide

## 📋 Overview

This guide outlines the implementation of a multi-tenant architecture for IdeaFlow, where each registration creates a new organization with proper role management and isolation.

## 🗄️ Database Structure

### Core Tables

#### 1. **organizations**
- Top-level entities (companies/individuals)
- Each organization has one admin and up to 2 moderators
- Type: 'organization' or 'individual'

#### 2. **organization_members**
- Multi-tenant user management
- Users can belong to multiple organizations with different roles
- Roles: 'admin', 'moderator', 'member'

#### 3. **moderator_licenses**
- Tracks moderator slots per organization (2 max)
- Auto-created when organization is created
- Auto-updated when moderators are assigned/removed

### Enhanced Tables
All existing tables now include `organization_id` for proper data isolation:
- profiles, groups, ideas, comments, evaluations, votes, etc.

## 🔄 Registration Flow

### Current Flow
```
User Registers → Profile Created → Access to Single Organization
```

### New Flow
```
User Registers → Organization Created → User becomes Admin → Access to Their Organization
```

### Registration Steps
1. **User Registration** (email/password)
2. **Organization Creation** (name + type)
3. **Auto-assign Admin Role**
4. **Create Moderator License** (2 slots)
5. **Redirect to Dashboard**

## 👥 Role System

### Organization Roles
- **Admin**: 1 per organization, full control
- **Moderator**: Up to 2 per organization, limited control
- **Member**: Unlimited, basic access

### Cross-Organization Access
- Users can be in multiple organizations
- Different roles in different organizations
- Complete data isolation between organizations

## 🛠️ Implementation Phases

### Phase 1: Database Structure ✅
- [x] Create migration SQL
- [x] Add organization_id to all tables
- [x] Create RLS policies
- [x] Create helper functions

### Phase 2: Registration Flow
- [ ] Update Auth component
- [ ] Add organization creation form
- [ ] Update user context
- [ ] Test registration flow

### Phase 3: Admin Panel
- [ ] Create organization management
- [ ] Add user search functionality
- [ ] Implement moderator assignment
- [ ] Add license tracking

### Phase 4: Query Updates
- [ ] Update all data fetching
- [ ] Add organization scoping
- [ ] Update PDF exports
- [ ] Test data isolation

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only see their organization's data
- Admins can manage their organization
- Complete isolation between organizations

### Helper Functions
- `get_user_organization_role()` - Get user's role in organization
- `is_organization_admin()` - Check if user is admin
- `is_organization_moderator()` - Check if user is moderator/admin
- `get_user_organizations()` - Get all user's organizations
- `can_assign_moderator()` - Check moderator license availability

## 📱 User Experience

### Admin Experience
- Create organization during registration
- Manage organization members
- Assign moderator roles (with license limits)
- Invite users to organization

### Member Experience
- Join multiple organizations
- Different roles in different organizations
- Seamless switching between organizations

### Moderator Experience
- Limited admin capabilities
- Can manage members (not other moderators)
- Can assign member roles

## 🚀 Migration Strategy

### Data Reset Approach
- Clean slate implementation
- Existing data will be reset
- Users will re-register with new flow

### Migration Steps
1. **Run Migration SQL** - Creates new structure
2. **Update Application Code** - Implement new flows
3. **Test Multi-Tenant Features** - Verify isolation
4. **Deploy to Production** - Go live with new system

## 🧪 Testing Checklist

### Registration Flow
- [ ] User can register and create organization
- [ ] User becomes admin automatically
- [ ] Moderator license is created
- [ ] User can access their organization

### Multi-Tenant Isolation
- [ ] Users can't see other organizations' data
- [ ] Admins can only manage their organization
- [ ] Data is properly scoped by organization

### Role Management
- [ ] Admin can assign moderators (up to 2)
- [ ] Moderator license limits are enforced
- [ ] Users can have different roles in different organizations

### Cross-Organization Access
- [ ] Users can join multiple organizations
- [ ] Role switching works correctly
- [ ] Data isolation is maintained

## 📊 Benefits

### For Users
- **Flexibility**: Join multiple organizations
- **Role Clarity**: Clear role definitions
- **Data Privacy**: Complete isolation

### For Organizations
- **Control**: Full control over their data
- **Scalability**: Can grow independently
- **Security**: Isolated from other organizations

### For Platform
- **Scalability**: Multi-tenant architecture
- **Monetization**: Organization-based pricing
- **Security**: Proper data isolation

## 🔧 Technical Implementation

### Database Functions
```sql
-- Get user's role in organization
SELECT get_user_organization_role(user_id, org_id);

-- Check if user is admin
SELECT is_organization_admin(user_id, org_id);

-- Get all user's organizations
SELECT * FROM get_user_organizations(user_id);

-- Check moderator license availability
SELECT can_assign_moderator(org_id);
```

### Application Code Updates
```typescript
// Get user's organizations
const { data: organizations } = await supabase
  .rpc('get_user_organizations', { user_uuid: user.id });

// Check if user is admin of current organization
const { data: isAdmin } = await supabase
  .rpc('is_organization_admin', { 
    user_uuid: user.id, 
    org_uuid: currentOrganizationId 
  });
```

## 🎯 Next Steps

1. **Review Migration SQL** - Ensure all requirements are met
2. **Update Registration Flow** - Implement organization creation
3. **Create Admin Panel** - User management and role assignment
4. **Update All Queries** - Add organization scoping
5. **Test Multi-Tenant Features** - Verify isolation and functionality

## 📝 Notes

- **Data Reset**: Existing data will be cleared for clean implementation
- **Backward Compatibility**: Not maintained - this is a breaking change
- **Testing**: Comprehensive testing required before production deployment
- **Documentation**: Update all user-facing documentation

---

*This implementation provides a solid foundation for multi-tenant architecture with proper role management and data isolation.*
