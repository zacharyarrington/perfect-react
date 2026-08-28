// DashboardPage — example analytics dashboard built entirely from the
// template's reusable components. Swap the demo data for your own.

import { PageHeader, StatCard, DataTable } from '../components/ui'
import { BarChart, LineChart, DonutChart } from '../components/charts'
import { IconUsers, IconActivity, IconClock, IconAlertTriangle } from '@tabler/icons-react'

// ── Demo data ────────────────────────────────────────────────────────────────

const WEEKLY = [
  { week: 'W1', signups: 84,  churn: 12 },
  { week: 'W2', signups: 102, churn: 9 },
  { week: 'W3', signups: 91,  churn: 15 },
  { week: 'W4', signups: 128, churn: 11 },
  { week: 'W5', signups: 143, churn: 8 },
  { week: 'W6', signups: 137, churn: 14 },
]

const TRAFFIC = [
  { day: 'Mon', visits: 1240, sessions: 860 },
  { day: 'Tue', visits: 1480, sessions: 1010 },
  { day: 'Wed', visits: 1390, sessions: 940 },
  { day: 'Thu', visits: 1610, sessions: 1150 },
  { day: 'Fri', visits: 1550, sessions: 1080 },
  { day: 'Sat', visits: 980,  sessions: 620 },
  { day: 'Sun', visits: 890,  sessions: 570 },
]

const SOURCES = [
  { name: 'Direct',   value: 4120 },
  { name: 'Search',   value: 3380 },
  { name: 'Referral', value: 1490 },
  { name: 'Social',   value: 780 },
  { name: 'Email',    value: 460 },
]

const RECENT = [
  { id: 1, event: 'User signed up',        actor: 'riley@example.com', status: 'ok',      when: '2 min ago' },
  { id: 2, event: 'Report exported',       actor: 'sam@example.com',   status: 'ok',      when: '18 min ago' },
  { id: 3, event: 'Payment failed',        actor: 'jo@example.com',    status: 'error',   when: '1 hr ago' },
  { id: 4, event: 'Role changed to Editor', actor: 'admin',            status: 'ok',      when: '2 hrs ago' },
  { id: 5, event: 'Sync retried',          actor: 'system',            status: 'warning', when: '3 hrs ago' },
]

const STATUS_BADGE = { ok: 'badge-green', warning: 'badge-amber', error: 'badge-red' }

export default function DashboardPage() {
  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="An example analytics view — every widget here is a reusable component from src/components."
      />

      {/* KPI row */}
      <div className="stat-grid">
        <StatCard label="Active users" value="1,284" delta={12.4} deltaLabel="vs last week" icon={<IconUsers size={16} />} />
        <StatCard label="Sessions today" value="6,231" delta={3.1} icon={<IconActivity size={16} />} />
        <StatCard label="Avg. session" value="4m 32s" delta={-1.8} icon={<IconClock size={16} />} />
        <StatCard label="Open incidents" value="3" delta={-40} invertDelta icon={<IconAlertTriangle size={16} />} />
      </div>

      {/* Charts */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Signups vs churn</div>
          <BarChart data={WEEKLY} xKey="week" stacked
            series={[{ key: 'signups', label: 'Signups' }, { key: 'churn', label: 'Churn' }]} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Traffic this week</div>
          <LineChart data={TRAFFIC} xKey="day"
            series={[{ key: 'visits', label: 'Visits' }, { key: 'sessions', label: 'Sessions' }]} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Traffic sources</div>
          <DonutChart data={SOURCES} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Recent activity</div>
          <DataTable
            columns={[
              { key: 'event', label: 'Event', sortable: true },
              { key: 'actor', label: 'Actor', sortable: true },
              { key: 'status', label: 'Status', render: (r) => <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span> },
              { key: 'when', label: 'When' },
            ]}
            rows={RECENT}
          />
        </div>
      </div>
    </div>
  )
}
