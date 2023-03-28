import * as React from 'react';
import './styles.scss';

interface IProps {
  status: 'online' | 'offline' | 'idle';
}

const StatusButton: React.FC<IProps> = (props) => (
  <span className={`status-btn ${props.status}`}></span>
);

export default StatusButton;
