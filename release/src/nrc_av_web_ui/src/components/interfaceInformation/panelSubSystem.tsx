/* eslint-disable max-lines-per-function */
import { Collapse, List, Space, Typography } from 'antd';
import * as React from 'react';
import { Subsystem, InterfaceMessage, Message } from '../../dtos/interface';
import SubSystemsHeader from './headerSubSystems';
const { Panel } = Collapse;

interface SubSystemsHeaderProps {
  item: Subsystem;
  vehicleId: number;
  dataExecute: InterfaceMessage;
  toggleHealthCheck: (name: string) => void;
  healthCheckInfoState: Map<string, boolean>;
}

const SubSystemsPanel: React.FC<SubSystemsHeaderProps> = ({
  item,
  dataExecute,
  toggleHealthCheck,
  healthCheckInfoState,
  vehicleId
}) => {
  const [errorSub, setErrorSub] = React.useState<any>();
  const [diagResponse, setDiagResponse] = React.useState<any>();
  const [topicErrorSub, setTopicErrorSub] = React.useState<any>();

  const renderRunSubSystem = (data?: Message[]) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }
    return (
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item: Message) => (
          <List.Item style={{ padding: '2px 10px' }}>
            <Space direction="horizontal" style={{ width: '100%', justifyContent: 'start' }}>
              <Typography.Text style={{ fontWeight: 'bold', fontSize: '14px' }}>
                Error
              </Typography.Text>
              <Typography.Text
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: 'red'
                }}
              >
                {item.message}
              </Typography.Text>
            </Space>
          </List.Item>
        )}
      />
    );
  };

  const renderErrorSubSystem = (data?: Message[]) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }
    return (
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item: Message) => (
          <List.Item style={{ padding: '2px 10px' }}>
            <Space direction="horizontal" style={{ width: '100%', justifyContent: 'start' }}>
              <Typography.Text style={{ fontWeight: 'bold', fontSize: '14px' }}>
                Error:
              </Typography.Text>
              <Typography.Text
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: 'red'
                }}
              >
                {item.message}
              </Typography.Text>
            </Space>
          </List.Item>
        )}
      />
    );
  };

  const renderDiagResponse = (data: any) => (
    <>
      <Typography.Text style={{ fontWeight: 'bold', fontSize: '14px', padding: '2px 10px' }}>
        Diagnostic:
      </Typography.Text>
      <div
        style={{
          padding: '2px 0px',
          fontWeight: 'bold',
          fontSize: '14px',
          color: 'red',
          marginLeft: '10px',
          marginTop: '-20px'
        }}
        dangerouslySetInnerHTML={{ __html: data }}
      />
    </>
  );

  const renderRunallSub = (data?: InterfaceMessage, idSubSystem?: number) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }
    return (
      <List
        itemLayout="horizontal"
        dataSource={data.message}
        renderItem={(item: Message) => {
          if (idSubSystem === item.subSystemId) {
            return (
              <List.Item style={{ padding: '2px 10px' }}>
                <Space direction="horizontal" style={{ width: '100%', justifyContent: 'start' }}>
                  <Typography.Text style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    Error
                  </Typography.Text>
                  <Typography.Text
                    style={{
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: 'red'
                    }}
                  >
                    {item.message}
                  </Typography.Text>
                </Space>
              </List.Item>
            );
          } else {
            return null;
          }
        }}
      />
    );
  };
  const renderHealthCheckInfo = (data?: any[]) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item) => {
          if (healthCheckInfoState.get(item.name)) {
            return (
              <List.Item style={{ padding: '2px 10px' }}>
                <Space direction="horizontal" style={{ width: '100%', justifyContent: 'start' }}>
                  <Typography.Text style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {item.name}
                  </Typography.Text>
                  <Typography.Text>
                    Rate: {item.healthCheckRate} MsgCount: {item.msgCount}
                  </Typography.Text>
                </Space>
              </List.Item>
            );
          } else {
            return null;
          }
        }}
      />
    );
  };
  return (
    <Collapse>
      <Panel
        key={item.id}
        header={
          <SubSystemsHeader
            subSystems={item}
            setErrorSub={setErrorSub}
            setDiagResponse={setDiagResponse}
            setTopicErrorSub={setTopicErrorSub}
            dataExecute={dataExecute}
            toggleHealthCheck={toggleHealthCheck}
            healthCheckInfoState={healthCheckInfoState}
            vehicleId={vehicleId}
          />
        }
      >
        {errorSub ? renderRunSubSystem(errorSub) : renderRunallSub(dataExecute, item.id)}
        {topicErrorSub ? renderErrorSubSystem(topicErrorSub) : null}
        {diagResponse ? renderDiagResponse(diagResponse) : null}
        {renderHealthCheckInfo(item.topics)}
      </Panel>
    </Collapse>
  );
};

export default SubSystemsPanel;
