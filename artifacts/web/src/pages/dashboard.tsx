import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetRatingsSummary, getGetRatingsSummaryQueryKey } from "@workspace/api-client-react";
import { getAirlineName } from "@/lib/airlines";
import { PlaneTakeoff, Activity, Users, Star, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "react-day-picker";

export function Dashboard() {
  const { data, isLoading, error } = useGetRatingsSummary({
    query: {
      queryKey: getGetRatingsSummaryQueryKey(),
    }
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Network-wide passenger satisfaction metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground">Total Global Ratings</p>
              <h2 className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-9 w-20" /> : data?.totalRatingsAllAirlines || 0}
              </h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <PlaneTakeoff className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground">Active Partners</p>
              <h2 className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-9 w-16" /> : data?.summary.length || 0}
              </h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground">System Status</p>
              <h2 className="text-xl font-bold text-amber-500 mt-1">Online</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle>Partner Airline Performance</CardTitle>
          <CardDescription>Average ratings aggregated across all registered flights</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              Failed to load ratings summary. Please try again.
            </div>
          ) : !data?.summary.length ? (
            <div className="p-12 text-center text-muted-foreground">
              No rating data available in the system yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.summary.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).map((airline) => (
                <div key={airline.iataCode} className="p-4 hover:bg-secondary/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center font-mono font-bold text-foreground border border-border">
                      {airline.iataCode || "??"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{getAirlineName(airline.iataCode)}</h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {airline.totalRatings} total ratings recorded
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <RatingStars rating={airline.averageRating || 0} />
                        <span className="font-mono font-bold text-lg">
                          {airline.averageRating ? airline.averageRating.toFixed(1) : "N/A"}
                        </span>
                      </div>
                    </div>
                    
                    {airline.iataCode && (
                      <Link href={`/airlines/${airline.iataCode}`}>
                        <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary group-hover:bg-primary/10">
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
