// The six sectors, plus a catch-all for stocks outside the list.

const SECTORS = [
  { id: "software", name: "Software", color: "#3b6fd4", trait: "Growth",
    blurb: "Programs and cloud services that businesses pay for every year. Often high growth, and prices can swing a lot when expectations change." },
  { id: "semis", name: "Semiconductors", color: "#7b52c9", trait: "Cyclical",
    blurb: "Chips and the machines that make them. Booming with AI, but the industry moves in cycles, so big rises and big falls both happen." },
  { id: "pharma", name: "Pharma", color: "#14907a", trait: "Defensive",
    blurb: "Medicines and vaccines. People need treatment in good and bad economies. A failed drug trial or patent expiry can still hit a single stock hard." },
  { id: "staples", name: "Consumer staples", color: "#c47a1a", trait: "Defensive",
    blurb: "Everyday products like food, drinks and soap. Usually steady, slower growth, and often pay dividends." },
  { id: "luxury", name: "Luxury & consumer", color: "#c4466e", trait: "Cyclical",
    blurb: "Fashion, cars, restaurants and home goods. Sales depend on how confident shoppers feel, especially in China and the US." },
  { id: "banks", name: "Banks", color: "#4d6680", trait: "Rate-sensitive",
    blurb: "Lending, payments and investment banking. Profits tend to rise with interest rates and fall when loans go bad in a recession." },
];

const OTHER = { id: "other", name: "Other / ETFs", color: "#8a93a6" };
