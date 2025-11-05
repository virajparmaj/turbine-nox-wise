export interface TurbineData {
  AT: number;
  AP: number;
  AH: number;
  AFDP: number;
  GTEP: number;
  TIT: number;
  TAT: number;
  TEY: number;
  CDP: number;
  CO: number;
  NOX: number;
}

export interface FieldStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p10: number;
  p90: number;
}

export type StatsMap = Record<keyof TurbineData, FieldStats>;

export async function parseCSV(csvPath: string): Promise<StatsMap> {
  const response = await fetch(csvPath);
  const text = await response.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  
  const data: TurbineData[] = lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header as keyof TurbineData] = parseFloat(values[i]);
      return obj;
    }, {} as TurbineData);
  });

  const stats: Partial<StatsMap> = {};
  
  for (const key of headers as (keyof TurbineData)[]) {
    const values = data.map(d => d[key]).filter(v => !isNaN(v)).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const len = values.length;
    
    stats[key] = {
      min: values[0],
      max: values[len - 1],
      mean: sum / len,
      median: values[Math.floor(len / 2)],
      p10: values[Math.floor(len * 0.1)],
      p90: values[Math.floor(len * 0.9)]
    };
  }
  
  return stats as StatsMap;
}
