import { Table, Collapse } from 'antd';
import React from 'react';
import { MsgReceived } from '../../../shared/constants';
import ipcMsg from '../../../shared/ipcMsg';

const { Panel } = Collapse;

interface IMessage {
  data: string;
  eventName: string;
  time?: string;
}

const MessageList = ({ listMessages }: { listMessages: IMessage[] }) => {
  const columns = [
    {
      title: 'Event',
      dataIndex: 'event',
      key: 'event'
    },
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data'
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 200
    }
  ];

  const convertedData = listMessages.map((entry: IMessage, index: number) => ({
    key: (index + 1).toString(),
    event: entry.eventName,
    data: entry.data,
    time: entry.time
  }));

  return (
    <div>
      <Table dataSource={convertedData} columns={columns} scroll={{ x: 400, y: 300 }} />
    </div>
  );
};

const CollapsibleMessageList = () => {
  const [isActive, setIsActive] = React.useState<string[]>(['1']);
  const [listMsg, setListMsg] = React.useState<IMessage[]>([]);

  const getCurrentTime = () => {
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    return formattedTime;
  };

  const receiveNewMsg = React.useCallback((newMsg: IMessage) => {
    const currentTime = getCurrentTime();
    const updatedMsg = {
      data: newMsg.data,
      eventName: newMsg.eventName,
      time: currentTime
    };
    setListMsg((prevListMsg: IMessage[]) => [updatedMsg, ...prevListMsg]);
  }, []);

  React.useEffect(() => {
    const ipcListener = (info: MsgReceived) => {
      receiveNewMsg(info);
    };

    window.ipcChannel.receive(ipcMsg.M2R.DATA_BACKEND, ipcListener);

    return () => {
      window.ipcChannel.removeAllListeners(ipcMsg.M2R.DATA_BACKEND);
    };
  }, [receiveNewMsg]);

  const onChange = (keys: string | string[]) => {
    setIsActive(typeof keys === 'string' ? [keys] : keys);
  };

  return (
    <Collapse
      activeKey={isActive}
      onChange={onChange}
      style={{ margin: '0 auto', width: '80%', textAlign: 'center' }}
    >
      <Panel header="Message Histories" key="0">
        <div style={{ overflowX: 'auto' }}>
          <MessageList listMessages={listMsg} />
        </div>
      </Panel>
    </Collapse>
  );
};

export default CollapsibleMessageList;
