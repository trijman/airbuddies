import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRegisterFlight } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Ticket, PlaneTakeoff } from "lucide-react";

const formSchema = z.object({
  flightNumber: z.string().min(2, "Flight number is required").max(10),
  flightDate: z.string().min(1, "Date is required"),
  passengerName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function Register() {
  const { toast } = useToast();
  const [registeredFlight, setRegisteredFlight] = useState<{flightNumber: string, date: string} | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flightNumber: "",
      flightDate: new Date().toISOString().split('T')[0],
      passengerName: "",
    },
  });

  const registerFlight = useRegisterFlight();

  const onSubmit = (data: FormValues) => {
    const deviceId = crypto.randomUUID();
    
    registerFlight.mutate(
      {
        data: {
          deviceId,
          flightNumber: data.flightNumber.toUpperCase(),
          flightDate: data.flightDate,
          passengerName: data.passengerName || undefined,
        },
      },
      {
        onSuccess: () => {
          setRegisteredFlight({
            flightNumber: data.flightNumber.toUpperCase(),
            date: data.flightDate,
          });
          toast({
            title: "Registration Successful",
            description: "You are now checked in for the flight mesh network.",
          });
          form.reset();
        },
        onError: (err) => {
          toast({
            title: "Registration Failed",
            description: "Could not register for this flight. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Mesh Registration</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Check in to connect with passengers onboard.</p>
        </div>

        {registeredFlight && (
          <Card className="bg-primary/5 border-primary/20 mb-8 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10 blur-2xl"></div>
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Successfully Registered</h3>
                <p className="text-muted-foreground text-sm mb-3">Your device is authenticated for the in-flight network.</p>
                <div className="flex gap-4 font-mono text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs uppercase block">Flight</span>
                    <span className="font-bold text-foreground">{registeredFlight.flightNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase block">Date</span>
                    <span className="font-bold text-foreground">{registeredFlight.date}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 border-border"
                  onClick={() => setRegisteredFlight(null)}
                >
                  Register Another Flight
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Flight Details</CardTitle>
            <CardDescription>Enter your itinerary to generate a secure mesh token.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="flightNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Flight Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. KL1234" {...field} className="font-mono uppercase bg-secondary/50 border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="flightDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="font-mono bg-secondary/50 border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="passengerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Passenger Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name to display in chat..." {...field} className="bg-secondary/50 border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium mt-4" 
                  disabled={registerFlight.isPending}
                >
                  {registerFlight.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <PlaneTakeoff className="w-5 h-5" />
                      Generate Mesh Token
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
