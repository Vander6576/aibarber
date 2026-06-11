/**
 * Timezone Brasília (GMT-3) Helper Utilities
 */

export const getTodayBrasiliaStr = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat('fr-CA', { 
      timeZone: 'America/Sao_Paulo', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    return formatter.format(new Date()); // Always returns "YYYY-MM-DD"
  } catch (e) {
    // Fallback GMT-3 adjustment
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const brDate = new Date(utc + (3600000 * -3));
    return brDate.toISOString().split('T')[0];
  }
};

export const getTomorrowBrasiliaStr = (): string => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formatter = new Intl.DateTimeFormat('fr-CA', { 
      timeZone: 'America/Sao_Paulo', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    return formatter.format(tomorrow);
  } catch (e) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const brDate = new Date(utc + (3600000 * -3));
    return brDate.toISOString().split('T')[0];
  }
};

export const getNowBrasiliaTime = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(new Date()); // Returns "HH:MM"
  } catch (e) {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const brDate = new Date(utc + (3600000 * -3));
    const hours = String(brDate.getHours()).padStart(2, '0');
    const minutes = String(brDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

export const getBrasiliaDayOfWeek = (dateStr: string): number => {
  // Parses "YYYY-MM-DD" safely and returns 0-6 day of week
  const parts = dateStr.split('-').map(Number);
  // Using 12:00:00 (midday) prevents day shifting when testing across different system GMTs
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  return d.getDay();
};
