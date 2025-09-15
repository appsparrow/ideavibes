# 🚀 IdeaVibes - Investment Idea Management Platform

A comprehensive platform for managing investment ideas, group collaboration, and meeting workflows with AI-powered features.

## ✨ Features

### 🎯 **Core Functionality**
- **Investment Idea Management**: Submit, review, and track investment opportunities
- **Group Collaboration**: Create and manage investment groups with role-based access
- **Meeting Management**: Schedule meetups with AI-powered note-taking and summaries
- **Document Management**: Attach and organize documents for each idea
- **User Roles**: Admin, Moderator, and Member roles with different permissions

### 💰 **Subscription Tiers**

#### **Free Tier**
- Create up to **1 group**
- Join **unlimited groups**
- **2 AI summaries** per month
- Basic meeting notes
- Community support

#### **Pro Tier** ($12/month)
- Create **unlimited groups**
- Join **unlimited groups**
- **Unlimited AI summaries**
- Rich text editing for meetings
- Meeting feedback surveys
- Export capabilities
- Priority support

### 🤖 **AI-Powered Features**
- **Automatic Meeting Summaries**: AI generates comprehensive summaries from meeting notes
- **Smart Note Processing**: Intelligent formatting and organization of meeting content
- **Action Item Extraction**: Automatically identifies and tracks action items
- **Usage Tracking**: Monitor AI feature usage with monthly limits for free users

### 👥 **Group Management**
- **Group Creation**: Pro users can create unlimited groups, Free users limited to 1
- **Invite System**: Share groups via invite codes
- **Role Management**: Admin and Member roles within groups
- **Member Management**: Add/remove members with confirmation dialogs
- **Group Scoping**: Ideas, meetings, and documents are scoped to groups

### 📊 **Meeting & Collaboration**
- **Meeting Scheduling**: Schedule meetups with agenda and notes
- **Real-time Notes**: Collaborative note-taking during meetings
- **AI Summaries**: Automatic generation of meeting summaries
- **Feedback Surveys**: Collect post-meeting feedback (Pro feature)
- **Action Items**: Track and manage follow-up tasks

### 🔒 **Security & Permissions**
- **Row Level Security (RLS)**: Database-level security policies
- **Role-based Access**: Different permissions for Admin, Moderator, Member
- **Group Isolation**: Users only see content from their groups
- **Confirmation Dialogs**: All destructive actions require confirmation

### 📱 **User Experience**
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Real-time Updates**: Live data synchronization
- **Toast Notifications**: User feedback for all actions
- **Loading States**: Proper loading indicators throughout

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router v6** with future flags enabled
- **shadcn/ui** component library
- **Tailwind CSS** for styling
- **Radix UI** primitives for accessibility

### **Backend & Database**
- **Supabase** for backend-as-a-service
- **PostgreSQL** database with Row Level Security
- **Real-time subscriptions** for live updates
- **Edge Functions** for AI processing

### **State Management**
- **React Query** for server state management
- **React Context** for client state
- **Custom hooks** for data fetching and management

### **AI & Integrations**
- **OpenAI API** for AI summaries and processing
- **Stripe** for subscription management (ready for integration)
- **Google Drive** integration for document management

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key (for AI features)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd ideavibes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Add your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up the database**
   
   Run the database setup scripts in your Supabase SQL editor:
   
   **First, run the main database updates:**
   ```sql
   -- Copy and paste the content from database-updates.sql
   ```
   
   **Then, run the Stripe integration setup:**
   ```sql
   -- Copy and paste the content from stripe-integration-setup.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📋 **Database Setup**

The application requires several database tables and policies. Run these SQL scripts in order:

### **1. Main Database Updates** (`database-updates.sql`)
- Adds subscription columns to profiles table
- Creates usage tracking table for free tier limits
- Sets up meeting feedback system
- Creates AI summary support

### **2. Stripe Integration** (`stripe-integration-setup.sql`)
- Adds Stripe-specific columns
- Creates subscription events table
- Sets up RLS policies for subscription management

## 🎨 **UI Components**

Built with **shadcn/ui** components:
- **Forms**: Input, Textarea, Select, Checkbox, Radio
- **Navigation**: Tabs, Breadcrumb, Navigation Menu
- **Data Display**: Table, Card, Badge, Avatar
- **Feedback**: Toast, Alert, Progress, Skeleton
- **Overlay**: Dialog, Sheet, Popover, Tooltip
- **Layout**: Separator, Scroll Area, Resizable

## 🔧 **Development**

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Project Structure**
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── pages/              # Page components
└── lib/                # Utility functions
```

## 🚀 **Deployment**

### **Deploy with Lovable**
1. Open [Lovable Project](https://lovable.dev/projects/75bb832d-0f80-4363-8364-ffa75f8282f1)
2. Click **Share → Publish**
3. Configure your domain in **Project → Settings → Domains**

### **Deploy to Cloudflare Pages**
The project is configured for Cloudflare Pages deployment with:
- **Babel-based React plugin** (not SWC) for compatibility
- **Simple Vite configuration** without complex optimizations
- **Proven deployment setup** that works reliably

## 🔒 **Security Features**

- **Row Level Security (RLS)** on all database tables
- **Authentication** via Supabase Auth
- **Role-based permissions** (Admin, Moderator, Member)
- **Group isolation** - users only see their group content
- **Confirmation dialogs** for all destructive actions
- **Input validation** and sanitization

## 📊 **Usage Tracking**

The platform tracks usage for free tier limits:
- **AI Summaries**: 2 per month for free users
- **Group Creation**: 1 group for free users
- **Meeting Creation**: Unlimited for all users
- **Document Uploads**: Unlimited for all users

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join GitHub Discussions for questions
- **Email**: Contact support for Pro tier users

## 🔮 **Roadmap**

### **Upcoming Features**
- [ ] **Mobile App**: React Native version
- [ ] **Advanced Analytics**: Detailed usage and performance metrics
- [ ] **API Integration**: RESTful API for third-party integrations
- [ ] **White-label**: Customizable branding for enterprise clients
- [ ] **Advanced AI**: More sophisticated AI features and custom models

### **Planned Improvements**
- [ ] **Performance**: Optimize bundle size and loading times
- [ ] **Accessibility**: Enhanced screen reader support
- [ ] **Internationalization**: Multi-language support
- [ ] **Offline Support**: Progressive Web App capabilities

---

**Built with ❤️ using React, TypeScript, and Supabase**