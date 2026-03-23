export interface WetsuitRec {
  label: string;
  thickness: string;
  notes: string;
  details: string[];
}

/**
 * Returns a wetsuit recommendation based on water temperature in °F.
 */
export function getWetsuitRecommendation(waterTempF: number): WetsuitRec {
  if (waterTempF > 85) {
    return {
      label: "Rash Guard",
      thickness: "—",
      notes: "Sun & abrasion protection only",
      details: [
        "No wetsuit needed at this temperature",
        "A rash guard or boardshorts are plenty",
        "Stay hydrated — you'll warm up fast",
      ],
    };
  }
  if (waterTempF >= 78) {
    return {
      label: "Shorty / Spring",
      thickness: "1–2mm",
      notes: "Short arms & legs; minimal insulation",
      details: [
        "Shorty or spring suit with short arms & legs",
        "1–2mm neoprene is enough for these temps",
        "Great for longer sessions without overheating",
      ],
    };
  }
  if (waterTempF >= 72) {
    return {
      label: "Full Suit (thin)",
      thickness: "2mm",
      notes: "Full coverage; comfortable for longer sessions",
      details: [
        "Thin full suit gives coverage without bulk",
        "2mm neoprene throughout",
        "Flatlock seams work fine at this range",
      ],
    };
  }
  if (waterTempF >= 65) {
    return {
      label: "Full Suit 3/2mm",
      thickness: "3/2mm",
      notes: "Most popular all-around wetsuit",
      details: [
        "3mm torso / 2mm limbs — the classic combo",
        "Glued & blind-stitched seams recommended",
        "The most versatile wetsuit you can own",
      ],
    };
  }
  if (waterTempF >= 58) {
    return {
      label: "Full Suit 4/3mm",
      thickness: "4/3mm",
      notes: "Add booties if on the cooler end",
      details: [
        "4mm torso / 3mm limbs for solid warmth",
        "Booties recommended below 62°F",
        "Sealed seams are a must at this range",
      ],
    };
  }
  if (waterTempF >= 52) {
    return {
      label: "Full Suit 5/4mm",
      thickness: "5/4mm",
      notes: "Booties + gloves recommended",
      details: [
        "5mm torso / 4mm limbs — serious cold water gear",
        "Booties and gloves are essential",
        "Look for internal chest lining for extra warmth",
      ],
    };
  }
  if (waterTempF >= 45) {
    return {
      label: "Hooded 5/4/3mm",
      thickness: "5/4/3mm",
      notes: "Hood, booties & gloves essential",
      details: [
        "Built-in or separate hood is non-negotiable",
        "5mm torso / 4mm legs / 3mm arms",
        "Full accessories: hood, 5mm booties, 3mm gloves",
      ],
    };
  }
  return {
    label: "Drysuit / 6mm+",
    thickness: "6/5mm+",
    notes: "Drysuit preferred; full hood, gloves, booties",
    details: [
      "Drysuit is the safest choice at these temps",
      "If wetsuit: 6/5mm+ with all accessories",
      "Limit session time — hypothermia risk is real",
    ],
  };
}
