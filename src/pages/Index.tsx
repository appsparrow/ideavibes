import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, TrendingUp, Vote } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to IdeaFlow</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Collaborative investment idea evaluation platform
          </p>
          <p className="text-sm text-muted-foreground">
            Logged in as: {user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submit Ideas</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">New</div>
              <p className="text-xs text-muted-foreground">
                Share your investment ideas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collaborate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Team</div>
              <p className="text-xs text-muted-foreground">
                Work together on evaluations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Score</div>
              <p className="text-xs text-muted-foreground">
                Rate market potential & feasibility
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vote</CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Decide</div>
              <p className="text-xs text-muted-foreground">
                Group decisions on opportunities
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button size="lg" className="mb-4" asChild>
            <Link to="/submit-idea">
              <Plus className="mr-2 h-4 w-4" />
              Submit New Idea
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Ready to start the deal flow process?
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
