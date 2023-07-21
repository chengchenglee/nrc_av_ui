/* eslint-disable max-lines-per-function */
import { useQueryClient } from '@tanstack/react-query';
import { Divider, Form, Modal, Spin, StepProps, Steps, message } from 'antd';
import * as React from 'react';
import { INTERFACES, INTERFACE_BY_ID } from '../../constants/query';
import { AddEditInterfaceDTO } from '../../dtos/interface';

import {
  useAddInterface,
  useEditInterface,
  useGetInterfaceById
} from '../../hooks/queries/interface';
import { addEditInterfaceDataAdaptor } from '../../utilities/converter';
import EditableTableC from '../EditableTable';
import { FieldData, fieldDataList } from './fieldData';
import AddEditInterfaceControl from './footer';
import NameField from './nameField';

export interface AddEditInterfaceModelMethods {
  showModal: () => void;
}

interface StepsData extends StepProps {
  renderComponent: (isShow: boolean) => React.ReactNode;
}

export type ModelType = 'ADD' | 'EDIT';

interface AddInterfaceModelProps {
  id?: number;
  mode?: ModelType;
}

const AddEditInterfaceModel = React.forwardRef<
  AddEditInterfaceModelMethods,
  AddInterfaceModelProps
>(({ id, mode = 'ADD' }, ref) => {
  const queryClient = useQueryClient();
  const getInterfaceQuery = useGetInterfaceById(id);
  const { mutate: addInterface } = useAddInterface();
  const { mutate: updateInterface } = useEditInterface();

  const [form] = Form.useForm<AddEditInterfaceDTO>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isHaveError, setIsHaveError] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    showModal: () => {
      setIsModalOpen(true);
    }
  }));

  const renderTableField = React.useCallback((field: FieldData, isShow: boolean) => {
    const { name, label, columns, addButton, tableProps } = field;
    return (
      <div
        key={name}
        style={{
          display: isShow ? 'block' : 'none'
        }}
      >
        <Divider orientationMargin={0} orientation="left">
          {label}
        </Divider>
        <EditableTableC {...tableProps} addTitle={addButton} name={name} columns={columns} />
      </div>
    );
  }, []);

  const stepItems = React.useMemo<StepsData[]>(
    () => [
      {
        title: 'Name',
        renderComponent: (isShow = true) => (
          <NameField
            key="name-field"
            setIsHaveError={setIsHaveError}
            isShow={isShow}
            mode={mode}
            currentEditingInterfaceName={getInterfaceQuery.data?.name}
          />
        )
      },
      ...fieldDataList.map<StepsData>((field) => ({
        title: field.label,
        renderComponent: (isShow = true) => renderTableField(field, isShow)
      }))
    ],
    [getInterfaceQuery.data?.name, mode, renderTableField]
  );

  const handleCancel = () => {
    setIsModalOpen(false);
    setCurrentStep(0);
    setIsHaveError(false);
    form.resetFields();
  };

  const onAddEditSuccess = () => {
    handleCancel();
    form.resetFields();
    setCurrentStep(0);
    queryClient.invalidateQueries([INTERFACES]);
    if (mode === 'EDIT') {
      queryClient.invalidateQueries([INTERFACE_BY_ID, id]);
    }

    message.success(`${mode === 'ADD' ? 'Add' : 'Update'} interface success`);
  };

  const onFormSubmit = (values: AddEditInterfaceDTO) => {
    if (mode === 'ADD') {
      addInterface(values, {
        onSuccess: onAddEditSuccess
      });
    } else if (mode === 'EDIT') {
      if (!id) {
        console.error('required id');
        return;
      }

      updateInterface({ id, data: values }, { onSuccess: onAddEditSuccess });
    }
  };

  const initialValue = React.useMemo(() => {
    if (mode === 'EDIT') {
      return addEditInterfaceDataAdaptor(getInterfaceQuery.data);
    }

    return undefined;
  }, [getInterfaceQuery.data, mode]);

  // NOTE: initial value only work on first render
  // So need to reset the form (to initial value) when have new initial value
  React.useEffect(() => {
    if (mode === 'EDIT') {
      form.setFieldsValue(initialValue || {});
    }
  }, [form, initialValue, mode]);

  return (
    <Modal
      className="model-custom"
      title={mode === 'ADD' ? 'Add new Interface' : 'Update Interface'}
      open={isModalOpen}
      destroyOnClose
      onCancel={handleCancel}
      maskClosable={false}
      width="max-content"
      style={{ minWidth: '90%' }}
      footer={<></>}
    >
      <Spin spinning={mode === 'EDIT' && getInterfaceQuery.isFetching} tip="Loading...">
        <Form initialValues={initialValue} form={form} onFinish={onFormSubmit}>
          <Steps current={currentStep} onChange={setCurrentStep} items={stepItems} />
          {stepItems.map((item, index) => item.renderComponent(currentStep === index))}

          {/* need to make sure the control buttons components get the context of the form
              so put this in there instead of footer attr of modal */}
          <AddEditInterfaceControl
            mode={mode}
            closeModel={handleCancel}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            isHaveError={isHaveError}
            numberOfSteps={stepItems.length}
          />
        </Form>
      </Spin>
    </Modal>
  );
});

AddEditInterfaceModel.displayName = 'AddInterfaceModel';

export default AddEditInterfaceModel;
