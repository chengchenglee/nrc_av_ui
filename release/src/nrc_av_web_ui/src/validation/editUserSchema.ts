import { ObjectSchema, object, string, number, boolean } from 'yup';

export interface EditUserFormValue {
  email: string;
  role: number | null;
  isActive: boolean;
  username?: string;
}

export const editUserSchema: ObjectSchema<EditUserFormValue> = object().shape({
  email: string()
    .email('Must be a valid email')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email')
    .required('Email is required')
    .matches(/^\S*$/, 'Whitespace is not allowed'),
  role: number().required('Role is required'),
  isActive: boolean().required('Required'),
  username: string()
});
