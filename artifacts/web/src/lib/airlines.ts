export const airlineMap: Record<string, string> = {
  KL: "KLM Royal Dutch Airlines",
  HV: "Transavia",
  LH: "Lufthansa",
  BA: "British Airways",
  EK: "Emirates",
};

export function getAirlineName(iataCode: string | null): string {
  if (!iataCode) return "Unknown Airline";
  return airlineMap[iataCode] || iataCode;
}
