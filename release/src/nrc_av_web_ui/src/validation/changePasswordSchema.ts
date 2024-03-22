import { ObjectSchema, object, ref, string } from 'yup';

export interface ChangePasswordFormValue {
  password: string;
  newPassword: string;
  confirmPassword: string;
}

export interface FirstTimeChangePasswordFormValue extends ChangePasswordFormValue {
  username: string;
}

export const changePasswordSchema: ObjectSchema<ChangePasswordFormValue> = object({
  password: string().required('Password is required').min(6, 'Must be at least 6 characters'),
  newPassword: string()
    .required('New password is required')
    .trim('Cannot contains spaces')
    .strict(true)
    .min(6, 'Must be at least 6 characters')
    .notOneOf([ref('password')], 'Must be different from old password')
    .matches(/^\S*$/, 'Whitespace is not allowed'),
  confirmPassword: string()
    .required('Confirm password is required')
    .trim('Cannot contains spaces')
    .strict(true)
    .min(6, 'Must be at least 6 characters')
    .oneOf([ref('newPassword')], 'Confirm password is not match with the new password')
    .matches(/^\S*$/, 'Whitespace is not allowed')
});

export const firstTimeChangePasswordSchema: ObjectSchema<FirstTimeChangePasswordFormValue> =
  changePasswordSchema.concat(
    object({
      username: string().required('Username is required')
    })
  );
