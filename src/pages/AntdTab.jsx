// AntdTab — "Ant Design" tab for the UI Kit page.
//
// A live reference for the Ant Design component library (https://ant.design),
// installed app-wide via <ConfigProvider> in src/App.jsx. AntD ships its own
// default theme (not yet mapped to this app's teal/dark design tokens — see
// the note in App.jsx), so components here will look visually distinct from
// the existing .btn/.card/.input system until that theming work happens.
//
// This tab is a starting reference, not a replacement for ExamplePage's
// other tabs yet — those still document the original hand-rolled system,
// which most of the app still runs on.

import { useState } from 'react'
import {
  Button, Card, Input, Select, Switch, Slider, Table, Tag, Space,
  Modal, Form, DatePicker, Progress, Statistic, Row, Col, Alert,
} from 'antd'
import { UserOutlined } from '@ant-design/icons'

const TABLE_ROWS = [
  { key: 1, name: 'Aurora', owner: 'Riley', size: 412, status: 'active' },
  { key: 2, name: 'Basalt', owner: 'Sam', size: 87, status: 'pending' },
  { key: 3, name: 'Cinder', owner: 'Jo', size: 1024, status: 'active' },
]
const STATUS_COLOR = { active: 'green', pending: 'gold', failed: 'red' }

const TABLE_COLUMNS = [
  { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
  { title: 'Owner', dataIndex: 'owner', key: 'owner' },
  { title: 'Size (MB)', dataIndex: 'size', key: 'size', sorter: (a, b) => a.size - b.size },
  {
    title: 'Status', dataIndex: 'status', key: 'status',
    render: (status) => <Tag color={STATUS_COLOR[status]}>{status}</Tag>,
  },
]

export default function AntdTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  return (
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      <Alert
        type="info"
        showIcon
        title="Ant Design is now available app-wide"
        description={
          <>
            Import components from <code>antd</code> directly — <code>import {'{'} Button {'}'} from
            'antd'</code>. This tab is a quick reference, not a full catalog; see{' '}
            <a href="https://ant.design/components/overview" target="_blank" rel="noreferrer">
              ant.design/components
            </a>{' '}
            for the complete set.
          </>
        }
      />

      <Card title="Buttons & Tags">
        <Space wrap>
          <Button type="primary">Primary</Button>
          <Button>Default</Button>
          <Button type="dashed">Dashed</Button>
          <Button type="text">Text</Button>
          <Button danger>Danger</Button>
          <Button type="primary" loading>Loading</Button>
          <Tag color="blue">blue</Tag>
          <Tag color="green">green</Tag>
          <Tag color="gold">gold</Tag>
          <Tag color="red">red</Tag>
        </Space>
      </Card>

      <Card title="Form controls">
        <Row gutter={16}>
          <Col span={8}>
            <Input placeholder="Text input" prefix={<UserOutlined />} />
          </Col>
          <Col span={8}>
            <Select
              defaultValue="viewer"
              style={{ width: '100%' }}
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'editor', label: 'Editor' },
                { value: 'viewer', label: 'Viewer' },
              ]}
            />
          </Col>
          <Col span={8}>
            <DatePicker style={{ width: '100%' }} />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Switch defaultChecked /> <span style={{ marginLeft: 8 }}>Notifications</span>
          </Col>
          <Col span={16}>
            <Slider defaultValue={60} />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="Active users" value={1284} /></Card></Col>
        <Col span={6}><Card><Statistic title="Sync" value={62} suffix="%" /></Card></Col>
        <Col span={12}>
          <Card>
            <Progress percent={62} status="active" />
            <Progress percent={100} status="success" style={{ marginTop: 8 }} />
          </Card>
        </Col>
      </Row>

      <Card title="Modal & Form">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Modal
          title="Add user"
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={() => form.submit()}
        >
          <Form form={form} layout="vertical" onFinish={() => setModalOpen(false)}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="Jane Doe" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="jane@example.com" />
            </Form.Item>
          </Form>
        </Modal>
      </Card>

      <Card title="Table">
        <Table columns={TABLE_COLUMNS} dataSource={TABLE_ROWS} pagination={false} />
      </Card>
    </Space>
  )
}
