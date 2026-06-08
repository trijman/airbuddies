import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/rating-stars";
import { getAirlineName } from "@/lib/airlines";
import { Link } from "wouter";
import {
  useGetAdminStats,
  getGetAdminStatsQueryKey,
  useGetAdminFlights,
  getGetAdminFlightsQueryKey,
  useGetRatingsSummary,
  getGetRatingsSummaryQueryKey,
} from "@workspace/api-client-react";
import {
  Users, PlaneTakeoff, Star, Activity, TrendingUp,
  ArrowRight, Calendar, Plane, BarChart3, RefreshCw,
} from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-9 w-24 mb-1" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          )}
          <p className="text-sm font-mono text-muted-foreground mt-1">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() },
  });
  const { data: flightsData, isLoading: flightsLoading } = useGetAdminFlights({
    query: { queryKey: getGetAdminFlightsQueryKey() },
  });
  const { data: ratingsData, isLoading: ratingsLoading } = useGetRatingsSummary({
    query: { queryKey: getGetRatingsSummaryQueryKey() },
  });

  const topAirline = ratingsData?.summary
    .slice()
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))[0];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Realtime platform statistics &amp; vluchtoverzicht
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Registraties"
          value={stats?.totalRegistrations ?? 0}
          sub="check-ins totaal"
          icon={Users}
          color="bg-primary/10 border border-primary/20 text-primary"
          loading={statsLoading}
        />
        <StatCard
          label="Passagiers"
          value={stats?.uniquePassengers ?? 0}
          sub="unieke apparaten"
          icon={PlaneTakeoff}
          color="bg-blue-500/10 border border-blue-500/20 text-blue-500"
          loading={statsLoading}
        />
        <StatCard
          label="Vluchten"
          value={stats?.totalFlights ?? 0}
          sub="unieke vluchten"
          icon={Plane}
          color="bg-violet-500/10 border border-violet-500/20 text-violet-500"
          loading={statsLoading}
        />
        <StatCard
          label="Ratings"
          value={stats?.totalRatings ?? 0}
          sub="beoordelingen"
          icon={Star}
          color="bg-amber-500/10 border border-amber-500/20 text-amber-500"
          loading={statsLoading}
        />
        <StatCard
          label="Gem. score"
          value={stats?.averageGlobalRating != null ? `${stats.averageGlobalRating.toFixed(1)} ★` : "–"}
          sub="over alle vluchten"
          icon={TrendingUp}
          color="bg-green-500/10 border border-green-500/20 text-green-500"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Registered Flights Table */}
        <div className="xl:col-span-2">
          <Card className="bg-card border-border h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Geregistreerde Vluchten
                  </CardTitle>
                  <CardDescription>
                    {flightsData ? `${flightsData.total} vluchten in het systeem` : "Alle check-ins"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {flightsLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : !flightsData?.flights.length ? (
                <div className="p-12 text-center">
                  <Plane className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nog geen vluchten geregistreerd</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-2 bg-secondary/30">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Vlucht</span>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-center w-28">Datum</span>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-center w-24">Passagiers</span>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-right w-28">Aangemeld</span>
                  </div>
                  {flightsData.flights.map((f) => (
                    <div
                      key={`${f.flightNumber}_${f.flightDate}`}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3.5 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded bg-secondary border border-border flex items-center justify-center font-mono text-xs font-bold text-foreground shrink-0">
                          {f.iataCode ?? f.flightNumber.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono font-semibold text-sm text-foreground">{f.flightNumber}</p>
                          <p className="text-xs text-muted-foreground">{getAirlineName(f.iataCode ?? "")}</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm text-muted-foreground text-center w-28">{f.flightDate}</span>
                      <div className="flex items-center justify-center gap-1.5 w-24">
                        <Users className="w-3.5 h-3.5 text-primary/70" />
                        <span className="font-mono font-semibold text-sm text-primary">{f.passengerCount}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground/60 text-right w-28">
                        {new Date(f.firstRegistered).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Airlines sidebar */}
        <div>
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Airline Rankings
              </CardTitle>
              <CardDescription>Gemiddelde passagiersscore</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {ratingsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !ratingsData?.summary.length ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Nog geen ratings</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {ratingsData.summary
                    .slice()
                    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
                    .slice(0, 8)
                    .map((airline, i) => (
                      <Link key={airline.iataCode} href={`/airlines/${airline.iataCode}`}>
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors">
                          <span className="text-xs font-mono text-muted-foreground/50 w-4">{i + 1}</span>
                          <div className="w-8 h-8 rounded bg-secondary border border-border flex items-center justify-center font-mono text-xs font-bold text-foreground shrink-0">
                            {airline.iataCode ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{getAirlineName(airline.iataCode ?? "")}</p>
                            <p className="text-xs text-muted-foreground font-mono">{airline.totalRatings} ratings</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span className="font-mono text-sm font-semibold">
                              {airline.averageRating?.toFixed(1) ?? "–"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
              {ratingsData && ratingsData.summary.length > 0 && (
                <div className="p-3 border-t border-border/40">
                  <Link href="/dashboard/airlines">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer py-1">
                      Bekijk alle airlines <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Best airline highlight */}
          {topAirline && (
            <Card className="bg-card border-primary/30 border mt-4">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-mono text-muted-foreground mb-0.5">Beste score</p>
                  <p className="font-semibold text-sm">{getAirlineName(topAirline.iataCode ?? "")}</p>
                  <RatingStars rating={topAirline.averageRating ?? 0} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Full airline table */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle>Alle Airline Ratings</CardTitle>
          <CardDescription>Passagiersoordelen per maatschappij, gesorteerd op score</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {ratingsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
            </div>
          ) : !ratingsData?.summary.length ? (
            <div className="p-12 text-center text-muted-foreground">
              Nog geen beoordelingen in het systeem.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {ratingsData.summary
                .slice()
                .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
                .map((airline) => (
                  <div key={airline.iataCode} className="px-5 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-secondary border border-border flex items-center justify-center font-mono font-bold text-sm text-foreground">
                        {airline.iataCode ?? "??"}
                      </div>
                      <div>
                        <h3 className="font-semibold">{getAirlineName(airline.iataCode ?? "")}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{airline.totalRatings} beoordelingen</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <RatingStars rating={airline.averageRating ?? 0} />
                          <span className="font-mono font-bold text-lg">
                            {airline.averageRating?.toFixed(1) ?? "–"}
                          </span>
                        </div>
                      </div>
                      {airline.iataCode && (
                        <Link href={`/airlines/${airline.iataCode}`}>
                          <div className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors cursor-pointer">
                            <ArrowRight className="w-4 h-4" />
                          </div>
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
