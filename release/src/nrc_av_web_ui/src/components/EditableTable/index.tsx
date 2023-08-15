/* eslint-disable indent */
/* eslint-disable max-lines-per-function */
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Checkbox, Form, Input, Popconfirm, Select, Table } from 'antd';
import { Rule } from 'antd/es/form';
import { NamePath } from 'antd/es/form/interface';
import { ColumnType, TableProps } from 'antd/es/table';
import * as React from 'react';
import './styles.scss';

export interface OptionConfig<T> {
  label: string;
  value: T;
}

export type EditableTableColumnProps<T> = Omit<ColumnType<T>, 'dataIndex'> & {
  dataIndex: string;
  rules?: Rule[];
  defaultValue?: any;
} & (
    | {
        inputType?: 'select' | 'checkbox' | 'boolean';
        valueType?: unknown;
        options?: OptionConfig<any>[];
      }
    | {
        inputType?: 'text';
        valueType?: 'string' | 'number' | 'boolean' | 'array';
        options?: unknown;
      }
  );

export interface HasKeyField {
  keyField: React.Key;
}

interface EditableTableCProps<T> extends TableProps<T> {
  name: NamePath;
  columns: EditableTableColumnProps<T>[];
  addTitle?: React.ReactNode;
}

interface HasRemove {
  remove?: () => void;
}

const EditableTableC = <T extends HasKeyField>({
  name,
  addTitle = 'Add new row',
  columns: columnsData,
  ...tableProps
}: EditableTableCProps<T>) => {
  const columns = React.useMemo<ColumnType<T & HasRemove>[]>(() => {
    const result = columnsData.map<ColumnType<T & HasRemove>>(
      ({ inputType, valueType, rules, dataIndex, options, defaultValue, ...rest }) => {
        // NOTE: default input type is text, can not assign in destructuring
        // Reason: it will be override by inputType type
        if (!inputType) {
          inputType = 'text';
        }

        return {
          render(value: any, record, index) {
            switch (inputType) {
              case 'text':
                return (
                  <Form.Item
                    style={{
                      margin: 0,
                      padding: 0
                    }}
                    initialValue={defaultValue ?? null}
                    key={record.keyField}
                    name={[index, dataIndex]}
                    rules={rules}
                  >
                    <Input style={{ padding: '1px 3px' }} type={valueType} />
                  </Form.Item>
                );
              case 'select':
                return (
                  <Form.Item
                    initialValue={defaultValue ?? null}
                    name={[index, dataIndex]}
                    rules={rules}
                    style={{
                      marginBottom: 0
                    }}
                  >
                    <Select dropdownMatchSelectWidth={false}>
                      {options?.map((option) => (
                        <Select.Option key={option.value} value={option.value}>
                          {option.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              case 'checkbox':
                return (
                  <Form.Item name={[index, dataIndex]} rules={rules}>
                    <Checkbox.Group
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      {options?.map(({ value, label }) => (
                        <Checkbox value={value} style={{ margin: 0 }} key={value}>
                          {label}
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                  </Form.Item>
                );
              // NOTE: treat boolean as a checkbox
              case 'boolean':
                return (
                  <Form.Item name={[index, dataIndex]} rules={rules} initialValue={value}>
                    <Checkbox style={{ display: 'flex', justifyContent: 'center' }} />
                  </Form.Item>
                );

              default:
                return <></>;
            }
          },
          // Set the width for the column with dataIndex equal to 'someColumnIndex'
          width: dataIndex === 'command' ? '75%' : undefined,
          ...rest
        };
      }
    );

    return [
      ...result,
      {
        title: 'Actions',
        width: '4vw',
        dataIndex: 'operation',
        render: (_, record) => (
          <Popconfirm
            key={record.keyField}
            title="Sure to delete?"
            onConfirm={() => record.remove?.()}
          >
            <a>
              <FontAwesomeIcon
                style={{ display: 'flex', margin: '0 auto' }}
                icon={faTrashAlt}
                size="1x"
                color="gray"
              />
            </a>
          </Popconfirm>
        )
      }
    ];
  }, [columnsData]);

  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <div style={{ padding: '0px' }}>
          <Form.Item>
            <Button onClick={() => add()} type="primary">
              {addTitle}
            </Button>
          </Form.Item>
          <Table
            dataSource={
              fields.map((item, index) => ({
                key: item.key,
                name: item.name,
                remove: () => {
                  remove(index);
                }
              })) as any
            }
            columns={columns as any}
            pagination={false}
            scroll={{ y: '38vh' }}
            style={{ padding: '0px', margin: '0px' }}
            size="small"
            {...tableProps}
          />
        </div>
      )}
    </Form.List>
  );
};

export default EditableTableC;
