// widgets.config — the widget type registry.
//
// Widgets are user-configured INSTANCES of a small set of flexible built-in
// types, not user-authored new types — a "chart" widget can be bar, line, or
// donut depending on its `config.variant`, so 4 types cover a wide surface.
// Users save a configured instance as a widget template (see widgetTemplates.js)
// which then shows up in the picker alongside these built-ins, so the system
// *feels* like unlimited custom widgets without the scope of a visual
// component-composition editor.
//
// To add a widget type:
//   1. Create src/widgets/types/MyWidget.jsx — it receives { instance, rows,
//      fields, value, delta, loading, error } from WidgetRenderer (see that
//      file for the exact contract).
//   2. Add an entry here with a configSchema (see configSchema.jsx for the
//      field-kind reference) describing its no-code config form.
//
// Components are registered with lazy() for the same reason pages/panels
// are: this registry is imported by the dashboard store, and widget types
// import the store's types back, so eager imports would create a cycle.
//
/* eslint-disable react-refresh/only-export-components -- registry file, not a component */

import { lazy } from 'react'
import { IconChartBar, IconNumbers, IconTable, IconNote } from '@tabler/icons-react'

const WIDGET_TYPES = [
  {
    id: 'stat',
    title: 'Stat Card',
    description: 'A single number with an optional trend vs. a prior period.',
    icon: <IconNumbers size={18} />,
    component: lazy(() => import('./types/StatWidget')),
    dataShape: 'aggregate',   // this type reduces rows to one number
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
    defaultConfig: {
      icon: null,
      invertDelta: false,
    },
    // Defaults to a real demo dataset so a freshly added widget shows
    // something immediately instead of an empty "pick a data source" state
    // — users can always rebind it once the config form (a later stage)
    // exists.
    defaultBinding: {
      sourceId: 'mock:weekly_signups',
      valueField: 'signups',
      aggregate: 'sum',       // sum | avg | count | min | max | last | first
      compareField: 'churn',
      refreshInterval: null,
    },
    configSchema: [
      { key: 'sourceId', scope: 'binding', kind: 'source-select', label: 'Data source', required: true },
      { key: 'valueField', scope: 'binding', kind: 'field-select', label: 'Value field', fieldType: 'number', required: true },
      {
        key: 'aggregate', scope: 'binding', kind: 'select', label: 'Aggregate',
        options: [
          { value: 'sum', label: 'Sum' }, { value: 'avg', label: 'Average' },
          { value: 'count', label: 'Count' }, { value: 'min', label: 'Minimum' },
          { value: 'max', label: 'Maximum' }, { value: 'last', label: 'Last value' },
          { value: 'first', label: 'First value' },
        ],
      },
      { key: 'compareField', scope: 'binding', kind: 'field-select', label: 'Compare field (optional)', fieldType: 'number', hint: 'Shown as a % change badge' },
      { key: 'invertDelta', scope: 'config', kind: 'checkbox', label: 'Down is good', hint: 'For metrics like errors or churn' },
      { key: 'refreshInterval', scope: 'binding', kind: 'refresh-interval', label: 'Auto-refresh' },
    ],
  },
  {
    id: 'chart',
    title: 'Chart',
    description: 'Bar, line, or donut chart from any data source.',
    icon: <IconChartBar size={18} />,
    component: lazy(() => import('./types/ChartWidget')),
    dataShape: 'rows',
    defaultLayout: { w: 6, h: 5, minW: 3, minH: 3 },
    defaultConfig: {
      variant: 'bar',    // bar | line | donut
      stacked: false,
    },
    // See stat's defaultBinding comment — same reasoning. valueField/
    // nameField are left null since they only apply once variant is
    // switched to 'donut' (the config form's visibleWhen guards them, and
    // widgets.config.jsx's own defaultConfig.variant is 'bar').
    defaultBinding: {
      sourceId: 'mock:daily_traffic',
      xField: 'day',
      seriesFields: ['visits', 'sessions'],
      valueField: null,    // donut only
      nameField: null,     // donut only
      refreshInterval: null,
    },
    configSchema: [
      { key: 'sourceId', scope: 'binding', kind: 'source-select', label: 'Data source', required: true },
      {
        key: 'variant', scope: 'config', kind: 'select', label: 'Chart type',
        options: [{ value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'donut', label: 'Donut' }],
      },
      {
        key: 'xField', scope: 'binding', kind: 'field-select', label: 'Category axis', required: true,
        visibleWhen: (v) => v.variant !== 'donut',
      },
      {
        key: 'seriesFields', scope: 'binding', kind: 'field-multiselect', label: 'Series', fieldType: 'number', required: true,
        visibleWhen: (v) => v.variant !== 'donut',
      },
      {
        key: 'nameField', scope: 'binding', kind: 'field-select', label: 'Slice name', required: true,
        visibleWhen: (v) => v.variant === 'donut',
      },
      {
        key: 'valueField', scope: 'binding', kind: 'field-select', label: 'Slice value', fieldType: 'number', required: true,
        visibleWhen: (v) => v.variant === 'donut',
      },
      {
        key: 'stacked', scope: 'config', kind: 'checkbox', label: 'Stack series',
        visibleWhen: (v) => v.variant === 'bar',
      },
      { key: 'refreshInterval', scope: 'binding', kind: 'refresh-interval', label: 'Auto-refresh' },
    ],
  },
  {
    id: 'table',
    title: 'Table',
    description: 'A sortable, searchable table of rows from a data source.',
    icon: <IconTable size={18} />,
    component: lazy(() => import('./types/TableWidget')),
    dataShape: 'rows',
    defaultLayout: { w: 6, h: 5, minW: 3, minH: 3 },
    defaultConfig: {
      searchable: true,
    },
    // See stat's defaultBinding comment — same reasoning.
    defaultBinding: {
      sourceId: 'mock:recent_activity',
      columns: [],   // [] = show every field
      refreshInterval: null,
    },
    configSchema: [
      { key: 'sourceId', scope: 'binding', kind: 'source-select', label: 'Data source', required: true },
      { key: 'columns', scope: 'binding', kind: 'field-multiselect', label: 'Columns', hint: 'Leave empty to show every column', max: 8 },
      { key: 'searchable', scope: 'config', kind: 'checkbox', label: 'Show search box' },
      { key: 'refreshInterval', scope: 'binding', kind: 'refresh-interval', label: 'Auto-refresh' },
    ],
  },
  {
    id: 'text',
    title: 'Text',
    description: 'A static note, heading, or instructions block — no data binding.',
    icon: <IconNote size={18} />,
    component: lazy(() => import('./types/TextWidget')),
    dataShape: 'none',
    defaultLayout: { w: 4, h: 3, minW: 2, minH: 2 },
    defaultConfig: {
      body: '',
      align: 'left',
    },
    defaultBinding: {},
    configSchema: [
      { key: 'body', scope: 'config', kind: 'textarea', label: 'Text', hint: 'Plain text — line breaks are preserved' },
      {
        key: 'align', scope: 'config', kind: 'select', label: 'Alignment',
        options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }],
      },
    ],
  },
]

export const WIDGET_TYPES_BY_ID = Object.fromEntries(WIDGET_TYPES.map((t) => [t.id, t]))

/** Default grid geometry per type, keyed by type id — used when a widget is added without an explicit layout. */
export const DEFAULT_WIDGET_LAYOUTS = Object.fromEntries(
  WIDGET_TYPES.map((t) => [t.id, { ...t.defaultLayout }])
)

export default WIDGET_TYPES
