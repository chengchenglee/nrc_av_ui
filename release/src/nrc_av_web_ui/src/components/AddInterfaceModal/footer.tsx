import { Button, Modal, Typography, message } from 'antd';
import useFormInstance from 'antd/es/form/hooks/useFormInstance';
import * as React from 'react';
import { ModelType } from '.';

interface AddInterfaceFooterProps {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  numberOfSteps: number;
  isHaveError: boolean;
  closeModel: () => void;
  mode: ModelType;
}

// eslint-disable-next-line max-lines-per-function
const AddEditInterfaceControl: React.FC<AddInterfaceFooterProps> = ({
  currentStep,
  setCurrentStep,
  numberOfSteps,
  isHaveError,
  closeModel,
  mode
}) => {
  const form = useFormInstance();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const onHandleNextClick = React.useCallback(async () => {
    if (currentStep < numberOfSteps - 1) {
      const values = await form.validateFields().catch(() => {
        message.error('Please fix the error before going to next step');
      });

      // only go to next step if the current step is valid and there is no error message on name
      if (values && !isHaveError) {
        setCurrentStep(currentStep + 1);
      }
    }
  }, [currentStep, form, isHaveError, numberOfSteps, setCurrentStep]);

  const onHandlePreviousClick = React.useCallback(async () => {
    if (currentStep <= 0) {
      return;
    }

    const values = await form.validateFields().catch(() => {
      message.error('Please fix the error before going to previous step');
    });

    if (values && !isHaveError) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, form, isHaveError, setCurrentStep]);

  const onSubmitButtonClick = React.useCallback(async () => {
    await form.validateFields();
    // expect no validate error and errorState is false to continue
    if (isHaveError) {
      return;
    }

    setIsModalOpen(true);
  }, [form, isHaveError]);

  const PreviousButton = React.useMemo(
    () => (
      <Button
        onClick={onHandlePreviousClick}
        disabled={currentStep === 0}
        key="previous"
        type="primary"
      >
        Previous
      </Button>
    ),
    [currentStep, onHandlePreviousClick]
  );

  const NextButton = React.useMemo(
    () => (
      <Button
        disabled={currentStep === numberOfSteps - 1}
        onClick={onHandleNextClick}
        key="next"
        type="primary"
      >
        Next
      </Button>
    ),
    [currentStep, onHandleNextClick, numberOfSteps]
  );

  const SubmitInterfaceButton = React.useMemo(
    () => (
      <Button key="add" type="primary" onClick={onSubmitButtonClick}>
        {mode === 'ADD' ? 'Add interface' : 'Update interface'}
      </Button>
    ),
    [mode, onSubmitButtonClick]
  );

  const CancelButton = React.useMemo(
    () => (
      <Button key="add" type="primary" danger onClick={closeModel}>
        Cancel
      </Button>
    ),
    [closeModel]
  );

  const handleOk = () => {
    form.submit();
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div
      style={{
        marginTop: '16px',
        display: 'flex',
        gap: '5px',
        justifyContent: 'flex-end'
      }}
    >
      {CancelButton}
      {PreviousButton}
      {NextButton}
      {SubmitInterfaceButton}

      <Modal title="Confirm" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
        <Typography>
          Are you sure you want to {mode === 'ADD' ? 'add' : 'update'} this interface? This action
          cannot be undone.
        </Typography>
      </Modal>
    </div>
  );
};

export default AddEditInterfaceControl;
