import { Link } from "wouter";
import { Plane, ChevronRight, Globe, Shield, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground dark flex flex-col">
      <header className="h-16 border-b border-border flex items-center justify-between px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Plane className="w-6 h-6" />
          <span>Airbuddies</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Partner Portal
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-primary text-primary-foreground">
              Flight Check-in
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-8 max-w-7xl mx-auto text-center relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-medium mb-8 border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            System Operational
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            In-flight connectivity, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              redefined for everyone.
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            A Bluetooth mesh messenger enabling passengers to connect, socialize, and share experiences without requiring internet access.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8 group">
                Register Your Flight
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 border-border hover:bg-secondary">
                View Airline Data
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-secondary/30 border-t border-border">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Internet Required</h3>
                  <p className="text-muted-foreground">
                    Powered by Bluetooth mesh technology, allowing passengers to chat and connect mid-air securely.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
                  <p className="text-muted-foreground">
                    Airlines gain deep insights into passenger satisfaction and engagement through our B2B portal.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
                  <p className="text-muted-foreground">
                    Anonymized interactions protect passenger privacy while fostering a community atmosphere.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} Airbuddies Systems Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
