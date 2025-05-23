import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Trending from "@/pages/Trending";
import Notifications from "@/pages/Notifications";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/auth-page";
import Sidebar from "@/components/Sidebar";
import MobileNavbar from "@/components/MobileNavbar";
import Messages from "@/pages/Messages";
import { useState } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function MainLayout({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState("home");
  
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex-1 min-h-screen ml-0 lg:ml-72">
        <div className="max-w-2xl mx-auto border-x border-border min-h-screen bg-white">
          {children}
        </div>
      </main>
      
      <MobileNavbar activeView={activeView} setActiveView={setActiveView} />
    </div>
  );
}

function Router() {
  const [activeView, setActiveView] = useState("home");

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <ProtectedRoute 
        path="/" 
        component={() => (
          <MainLayout>
            <Home activeView={activeView} setActiveView={setActiveView} />
          </MainLayout>
        )} 
      />
      
      <ProtectedRoute 
        path="/search" 
        component={() => (
          <MainLayout>
            <Search activeView={activeView} setActiveView={setActiveView} />
          </MainLayout>
        )} 
      />
      
      <ProtectedRoute 
        path="/trending" 
        component={() => (
          <MainLayout>
            <Trending activeView={activeView} setActiveView={setActiveView} />
          </MainLayout>
        )} 
      />
      
      <ProtectedRoute 
        path="/notifications" 
        component={() => (
          <MainLayout>
            <Notifications activeView={activeView} setActiveView={setActiveView} />
          </MainLayout>
        )} 
      />
      
      <ProtectedRoute 
        path="/profile" 
        component={() => (
          <ProfilePage activeView={activeView} setActiveView={setActiveView} />
        )} 
      />

      <ProtectedRoute 
        path="/messages" 
        component={() => (
          <MainLayout>
            <Messages />
          </MainLayout>
        )} 
      />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
