import { Divider, Form, Input } from 'antd';
import useFormInstance from 'antd/es/form/hooks/useFormInstance';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import { useDebounce } from 'usehooks-ts';
import { AddEditInterfaceDTO } from '../../dtos/interface';
import { useGetFilterInterface } from '../../hooks/queries/interface';
import { ModelType } from '.';

interface NameFieldProps {
  isShow: boolean;
  setIsHaveError: Dispatch<SetStateAction<boolean>>;
  mode: ModelType;
  currentEditingInterfaceName?: string;
}

const NameField: FC<NameFieldProps> = ({
  isShow,
  setIsHaveError,
  mode,
  currentEditingInterfaceName
}) => {
  const form = useFormInstance<AddEditInterfaceDTO>();
  // for control message to show
  const [nameErrorMessage, setNameErrorMessage] = useState<string | undefined>();

  const watchedName = Form.useWatch('name', form);
  const debouncedName = useDebounce(watchedName, 500);

  const { data } = useGetFilterInterface(
    { name: debouncedName },
    // for skip check validate on the name is the same with current editing interface name
    currentEditingInterfaceName?.trim() !== debouncedName
  );

  useEffect(() => {
    // NOTE: if current mode is Edit, skip this validation
    if (mode === 'EDIT' && currentEditingInterfaceName?.trim() === debouncedName) {
      setNameErrorMessage(undefined);
      setIsHaveError(false);
      return;
    }

    if (data) {
      setNameErrorMessage('Interface name is existed');
      setIsHaveError(true);
    } else {
      setNameErrorMessage(undefined);
      setIsHaveError(false);
    }
  }, [currentEditingInterfaceName, data, debouncedName, form, mode, setIsHaveError]);

  return (
    <div
      style={{
        display: isShow ? 'block' : 'none'
      }}
    >
      <Divider orientationMargin={0} orientation="left">
        Name
      </Divider>
      <Form.Item
        name="name"
        rules={[
          {
            required: true,
            message: 'Required'
          }
        ]}
        help={nameErrorMessage}
        validateStatus={nameErrorMessage && 'error'}
        shouldUpdate
      >
        <Input
          onBlur={() => {
            form.validateFields();
          }}
          style={{ width: '250px' }}
        />
      </Form.Item>
    </div>
  );
};

export default NameField;
