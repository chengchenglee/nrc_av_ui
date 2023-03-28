import * as React from 'react';

interface Props {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  title: string;
  errorMessage: string;
  successMessage: string;
  isError: boolean;
  data: string | undefined;
}

const ROSResult: React.FC<Props> = ({ title, errorMessage, successMessage, isError, data }) => (
  <div>
    {(data || isError) && <span style={{ fontWeight: 'bolder' }}>{title}</span>}
    {isError && <span style={{ fontWeight: 'bolder', color: 'red' }}> {errorMessage}</span>}
    {data && <span style={{ fontWeight: 'bolder', color: 'green' }}> {successMessage}</span>}
    {data && data.length > 0 && data.split('\n').map((i) => <p key={i}>{i}</p>)}
  </div>
);

export default ROSResult;
