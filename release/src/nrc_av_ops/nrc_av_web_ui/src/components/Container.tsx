import * as React from 'react';

interface Props {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const Container: React.FC<Props> = ({ children, ...rest }) => (
  <div {...rest} className="container">
    {children}
  </div>
);

export default Container;
