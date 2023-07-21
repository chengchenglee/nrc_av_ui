import * as React from 'react';
import { Status } from '../../types/types';
import './styles.scss';

interface IProps {
  status: Status;
}

const StatusButton: React.FC<IProps> = (props) => (
  <span className={`status-btn ${props.status}`}></span>
);

export default StatusButton;
