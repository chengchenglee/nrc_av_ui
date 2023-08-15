import { TableProps } from 'antd';
import { Rule } from 'antd/es/form';
import { ReactNode } from 'react';
import EditableTableC, { EditableTableColumnProps } from '../EditableTable';

export interface FieldData {
  name: string;
  label: string;
  columns: EditableTableColumnProps<any>[];
  rules?: Rule[];
  addButton?: ReactNode;
  tableProps?: TableProps<any>;
}

const RuleConfig = {
  required: {
    required: true,
    message: 'required'
  }
};

export const multiDestinationColumns: EditableTableColumnProps<any>[] = [
  {
    title: 'posX',
    dataIndex: 'posX',
    rules: [RuleConfig.required],
    valueType: 'number'
  },
  {
    title: 'posY',
    dataIndex: 'posY',
    rules: [RuleConfig.required],
    valueType: 'number'
  },
  {
    title: 'posTh',
    dataIndex: 'posTh',
    rules: [RuleConfig.required],
    valueType: 'number'
  }
];

export const fieldDataList: FieldData[] = [
  {
    name: 'machines',
    label: 'Machines',
    addButton: 'Add Machine',
    columns: [
      {
        title: 'Name',
        dataIndex: 'name',
        rules: [RuleConfig.required]
      },
      {
        title: 'Address',
        dataIndex: 'addr',
        rules: [RuleConfig.required]
      }
    ]
  },
  {
    name: 'commands',
    label: 'Commands',
    addButton: 'Add Command',
    columns: [
      {
        title: 'Name',
        dataIndex: 'name',
        rules: [RuleConfig.required]
      },
      {
        title: 'Command',
        dataIndex: 'command'
      }
    ]
  },
  {
    name: 'algorithms',
    label: 'Algorithms',
    addButton: 'Add Algorithm',
    columns: [
      {
        title: 'Name',
        dataIndex: 'name',
        rules: [RuleConfig.required],
        inputType: 'text'
      },
      {
        title: 'Error Rate',
        dataIndex: 'errRate',
        rules: [RuleConfig.required],
        valueType: 'number'
      },
      {
        title: 'Warn Rate',
        dataIndex: 'warnRate',
        rules: [RuleConfig.required],
        valueType: 'number'
      },
      {
        title: 'Topic Name',
        dataIndex: 'topicName',
        rules: [RuleConfig.required]
      },
      {
        title: 'Topic Type',
        dataIndex: 'topicType',
        rules: [RuleConfig.required]
      }
    ]
  },
  {
    name: 'sensors',
    label: 'Sensors',
    addButton: 'Add Sensor',
    columns: [
      {
        title: 'Name',
        dataIndex: 'name'
      },
      {
        title: 'Error Rate',
        dataIndex: 'errRate',
        rules: [RuleConfig.required],
        valueType: 'number'
      },
      {
        title: 'Warn Rate',
        dataIndex: 'warnRate',
        rules: [RuleConfig.required],
        valueType: 'number'
      },
      {
        title: 'Topic Name',
        dataIndex: 'topicName',
        rules: [RuleConfig.required]
      },
      {
        title: 'Topic Type',
        dataIndex: 'topicType',
        rules: [RuleConfig.required]
      }
    ]
  },
  {
    name: 'interfaceDestinations',
    label: 'Destinations',
    addButton: 'Add Destination',
    columns: [
      {
        title: 'Name',
        dataIndex: 'name',
        rules: [RuleConfig.required],
        inputType: 'text'
      },
      {
        title: 'posX',
        dataIndex: 'posX',
        rules: [RuleConfig.required],
        valueType: 'number'
      },
      {
        title: 'posY',
        dataIndex: 'posY',
        rules: [RuleConfig.required],
        valueType: 'number'
      },
      {
        title: 'posTh',
        dataIndex: 'posTh',
        rules: [RuleConfig.required],
        valueType: 'number'
      }
    ]
  },
  {
    name: 'multiDestinations',
    label: 'Multi Destinations',
    addButton: 'Add Multi Destination',
    tableProps: {
      expandable: {
        expandedRowRender: (record) => (
          <EditableTableC
            addTitle="Add Destination"
            columns={multiDestinationColumns}
            name={[record.name, 'destinations']}
          />
        )
      }
    },
    columns: [
      {
        title: 'Name',
        dataIndex: 'name',
        rules: [RuleConfig.required],
        inputType: 'text'
      }
    ]
  }
];
