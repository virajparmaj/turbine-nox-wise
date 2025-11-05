export interface Rule {
  condition: (inputs: Record<string, number>) => boolean;
  message: string;
  severity: 'green' | 'yellow' | 'orange' | 'red';
}

export const rules: Rule[] = [
  {
    condition: (i) => i.AFDP > 1.0,
    message: "Air filter likely restricted — clean or replace filters.",
    severity: 'red'
  },
  {
    condition: (i) => i.AT < 10,
    message: "Cold intake air raising NOx — use inlet heating or soften firing / reduce load.",
    severity: 'orange'
  },
  {
    condition: (i) => i.TEY > 160,
    message: "High load increasing NOx — consider temporary load reduction.",
    severity: 'orange'
  },
  {
    condition: (i) => i.AH < 30,
    message: "Dry air — expect higher NOx; monitor and adjust as needed.",
    severity: 'yellow'
  },
  {
    condition: (i) => i.TIT > 1100,
    message: "Combustion very hot — check firing or increase dilution.",
    severity: 'orange'
  },
  {
    condition: (i) => i.TAT < 520,
    message: "Low exhaust temperature — check mixing/exhaust balance.",
    severity: 'yellow'
  }
];

export function evaluateRecommendations(inputs: Record<string, number>) {
  const triggered = rules.filter(rule => rule.condition(inputs));
  
  if (triggered.length === 0) {
    return {
      messages: ["Operating within normal limits."],
      severity: 'green' as const
    };
  }
  
  const severityOrder = { green: 0, yellow: 1, orange: 2, red: 3 };
  const maxSeverity = triggered.reduce((max, rule) => 
    severityOrder[rule.severity] > severityOrder[max] ? rule.severity : max,
    'green' as const
  );
  
  return {
    messages: triggered.slice(0, 3).map(r => r.message),
    severity: maxSeverity
  };
}
