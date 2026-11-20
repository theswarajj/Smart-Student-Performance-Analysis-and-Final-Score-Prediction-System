/** Map model factor names to human-readable labels */
export const factorLabels: Record<string, string> = {
  Attendance: 'Attendance',
  Hours_Studied: 'Study Hours',
  Previous_Scores: 'Previous Scores',
  Tutoring_Sessions: 'Tutoring Sessions',
  Motivation_Level: 'Motivation',
  Parental_Involvement: 'Parental Support',
  Peer_Influence: 'Peer Influence',
  Access_to_Resources: 'Resources Access',
  Teacher_Quality: 'Teaching Quality',
  Physical_Activity: 'Physical Activity',
  Sleep_Hours: 'Sleep Hours',
};

/** Map factor names to parent-friendly text */
export const parentFactorLabels: Record<string, string> = {
  Attendance: 'Time spent in class',
  Hours_Studied: 'Weekly study time',
  Previous_Scores: 'Earlier exam results',
  Tutoring_Sessions: 'Extra help sessions attended',
  Motivation_Level: 'Interest in studies',
  Parental_Involvement: 'Support from home',
  Peer_Influence: "Friends' study habits",
  Access_to_Resources: 'Learning resources available',
  Teacher_Quality: 'Quality of teaching support',
  Physical_Activity: 'Exercise routine',
  Sleep_Hours: 'Sleep routine',
};

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'High': return 'var(--risk-high)';
    case 'Medium': return 'var(--risk-medium)';
    case 'Low': return 'var(--risk-low)';
    default: return 'var(--text-muted)';
  }
}

export function getRiskBadgeClass(risk: string): string {
  switch (risk) {
    case 'High': return 'badge badge-risk-high';
    case 'Medium': return 'badge badge-risk-medium';
    case 'Low': return 'badge badge-risk-low';
    default: return 'badge';
  }
}

export function getRiskIcon(risk: string): string {
  switch (risk) {
    case 'High': return '🛡️';
    case 'Medium': return '⚡';
    case 'Low': return '✅';
    default: return '❓';
  }
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(1)}`;
  return delta.toFixed(1);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
