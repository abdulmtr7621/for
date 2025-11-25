import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import RulesPage from "@/pages/rules";
import SectionPage from "@/pages/section";
import CreatePostPage from "@/pages/create-post";
import ProfilePage from "@/pages/profile";
import MessagesPage from "@/pages/messages";
import AppealsPage from "@/pages/appeals";
import StatsPage from "@/pages/stats";
import WarningsPage from "@/pages/warnings";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }): JSX.Element | null {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component />;
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to="/home" /> : <AuthPage />}
      </Route>
      <Route path="/">
        {user ? <Redirect to="/home" /> : <LandingPage />}
      </Route>
      <Route path="/home">
        <ProtectedRoute component={HomePage} />
      </Route>
      <Route path="/rules">
        <ProtectedRoute component={RulesPage} />
      </Route>
      <Route path="/section/:section">
        <ProtectedRoute component={SectionPage} />
      </Route>
      <Route path="/section/:section/new">
        <ProtectedRoute component={CreatePostPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/messages">
        <ProtectedRoute component={MessagesPage} />
      </Route>
      <Route path="/appeals">
        <ProtectedRoute component={AppealsPage} />
      </Route>
      <Route path="/stats">
        <ProtectedRoute component={StatsPage} />
      </Route>
      <Route path="/warnings">
        <ProtectedRoute component={WarningsPage} />
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (!user) {
    return <Router />;
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-3 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
