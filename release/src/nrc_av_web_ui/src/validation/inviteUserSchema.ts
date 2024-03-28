import { ObjectSchema, object, string } from 'yup';

export interface InviteUserFormValue {
  username: string;
  email: string;
  roles: string;
}

export const inviteUserSchema: ObjectSchema<InviteUserFormValue> = object({
  username: string()
    .required('Username is required')
    .min(6, 'Min length is 6 characters')
    .matches(/^\S*$/, 'Whitespace is not allowed'),
  email: string()
    .email('Must be a valid email')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email')
    .required('Email is required')
    .matches(/^\S*$/, 'Whitespace is not allowed'),
  roles: string().required('Role is required')
});
