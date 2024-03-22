import { Form, Select as SelectAntd, SelectProps as SelectAntdProps } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ErrorMessageStatus } from './TextField';

//@TODO: Handle multiple selections

interface SelectProps {
  name: string;
  label: string;
  options: DefaultOptionType[];
  defaultValue?: string;
  selectComponentProps?: SelectAntdProps;
  asterisk?: boolean;
}

const Select: FC<SelectProps> = ({
  name,
  label,
  defaultValue = '',
  selectComponentProps,
  options,
  asterisk = false
}) => {
  const { control, formState } = useFormContext();
  const isError = (): ErrorMessageStatus => {
    if (!formState.errors[name]) {
      return { err: '', message: '' };
    }
    return {
      err: 'error',
      message:
        typeof formState.errors[name]?.message === 'string'
          ? String(formState.errors[name]?.message)
          : undefined
    };
  };
  return (
    <Form.Item
      label={label}
      style={{ width: '100%' }}
      validateStatus={isError().err}
      help={isError().message}
      required={asterisk}
    >
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field }) => (
          <SelectAntd {...field} options={options} {...selectComponentProps}>
            {options.map((opt) => (
              <SelectAntd.Option key={opt.value} value={opt.value}>
                {opt.label}
              </SelectAntd.Option>
            ))}
          </SelectAntd>
        )}
      />
    </Form.Item>
  );
};

export default Select;
