import { FC, ReactNode } from 'react';
import { FieldValues, UseFormReturn, FormProvider } from 'react-hook-form';

interface FormWrapperProps<T extends FieldValues = any, V = any> {
  methods: UseFormReturn<T, V>;
  children: ReactNode;
}

const FormWrapper: FC<FormWrapperProps> = ({ methods, children }) => (
  <FormProvider {...methods}>{children}</FormProvider>
);

export default FormWrapper;
