import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { useGetAirlineRatings, getGetAirlineRatingsQueryKey } from "@workspace/api-client-react";
import { getAirlineName } from "@/lib/airlines";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Plane, BarChart3, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/rating-stars";

export function AirlineDetail() {
  const { iataCode } = useParams();
  
  const { data, isLoading, error } = useGetAirlineRatings(iataCode || "", {
    query: {
      enabled: !!iataCode,
      queryKey: getGetAirlineRatingsQueryKey(iataCode || ""),
    }
  });

  if (!iataCode) return null;

  const airlineName = getAirlineName(iataCode);

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground pl-0 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Overview
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-mono font-bold text-2xl text-primary">
          {iataCode}
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{airlineName}</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Detailed performance metrics</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6 text-destructive text-center font-medium">
            Failed to load data for {airlineName}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Satisfaction Score
              </CardTitle>
              <CardDescription>Average rating across all flights</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="text-7xl font-bold font-mono tracking-tighter text-foreground mb-4">
                {data?.averageRating ? data.averageRating.toFixed(1) : "N/A"}
              </div>
              <RatingStars rating={data?.averageRating || 0} size="lg" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Engagement Volume
              </CardTitle>
              <CardDescription>Total ratings submitted by passengers</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="text-7xl font-bold font-mono tracking-tighter text-foreground mb-2">
                {data?.totalRatings || 0}
              </div>
              <p className="text-muted-foreground uppercase tracking-widest text-sm font-semibold">Total Responses</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                System Health & Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg bg-secondary/20">
                <p className="text-muted-foreground text-sm font-mono flex flex-col items-center gap-2">
                  <Plane className="w-8 h-8 text-border" />
                  Detailed telemetrics coming in next update
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
