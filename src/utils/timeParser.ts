export function parseTimeRange(
  date: string,    
  range: string    
) {
  const [startRaw, endRaw] = range.split("-").map(Number);

  const to24Hour = (hour: number) => {
    if (hour >= 8 && hour <= 11) return hour;   
    if (hour === 12) return 12;                
    return hour + 12;                          
  };

  const startHour = to24Hour(startRaw);
  const endHour = to24Hour(endRaw);

  const start = new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00`);
  const end = new Date(`${date}T${String(endHour).padStart(2, "0")}:00:00`);

  if (end <= start) {
    throw new Error("Invalid time range");
  }

  return { start, end };
}
