/* eslint-disable no-confusing-arrow */
import { Form, FormItemProps, Input } from 'antd';
import { CSSProperties, FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

interface CustomTextFieldProps {
  name: string;
  label: string;
  inputStyle?: CSSProperties;
  password?: boolean;
  disabled?: boolean;
  defaultValue?: string;
  asterisk?: boolean;
}

export interface ErrorMessageStatus {
  err: FormItemProps['validateStatus'];
  message?: string;
}

const TextField: FC<CustomTextFieldProps> = ({
  name,
  label,
  inputStyle,
  password = false,
  disabled = false,
  defaultValue = '',
  asterisk = false
}) => {
  const { control, formState, trigger } = useFormContext();
  const commonInputStyle: CSSProperties = { ...inputStyle, width: '100%' };
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
        render={({ field }) =>
          password ? (
            <Input.Password
              {...field}
              onChange={(e) => {
                field.onChange(e);
                trigger();
              }}
              style={commonInputStyle}
              disabled={disabled}
            />
          ) : (
            <Input {...field} style={commonInputStyle} disabled={disabled} />
          )
        }
      />
    </Form.Item>
  );
};

export default TextField;
