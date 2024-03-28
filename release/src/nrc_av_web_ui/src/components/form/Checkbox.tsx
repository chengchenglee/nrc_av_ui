import { Checkbox as CheckboxAntd, Form } from 'antd';
import { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ErrorMessageStatus } from './TextField';

interface CheckboxProps {
  name: string;
  label: string;
  defaultValue?: string;
  asterisk?: boolean;
}

const Checkbox: FC<CheckboxProps> = ({ label, name, defaultValue, asterisk }) => {
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
        render={({ field }) => <CheckboxAntd {...field} checked={field.value}></CheckboxAntd>}
      />
    </Form.Item>
  );
};

export default Checkbox;
