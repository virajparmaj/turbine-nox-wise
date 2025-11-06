export interface Rule {
  condition: (inputs: Record<string, number>) => boolean;
  message: string;
  severity: 'green' | 'yellow' | 'orange' | 'red';
}

export const rules: Rule[] = [
  {
    condition: (i) => i.AFDP > 1.0,
    message: "Filters likely clogged — schedule cleaning.",
    severity: 'red'
  },
  {
    condition: (i) => i.AT < 10,
    message: "Cold air may increase NOx — enable inlet heating.",
    severity: 'orange'
  },
  {
    condition: (i) => i.TIT > 1100,
    message: "Combustion too hot — check firing or dilution.",
    severity: 'orange'
  },
  {
    condition: (i) => i.TEY > 160,
    message: "High load increasing NOx — consider load reduction.",
    severity: 'orange'
  },
  {
    condition: (i) => i.AH < 30,
    message: "Dry air may raise NOx — monitor humidity.",
    severity: 'yellow'
  },
  {
    condition: (i) => i.TAT > 550,
    message: "High exhaust temperature — retune airflow balance.",
    severity: 'orange'
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
    messages: triggered.map(r => r.message),
    severity: maxSeverity
  };
}
