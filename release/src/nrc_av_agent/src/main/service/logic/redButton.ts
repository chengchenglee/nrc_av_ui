import { inject, injectable } from 'inversify';
import { RecordingStatus } from '../../../shared/constants';
import TYPES from '../../inversify/types';
import type { IChildProcess, IRedButton } from '../../inversify/interfaces';

@injectable()
export default class RedButton implements IRedButton {
  // eslint-disable-next-line no-use-before-define
  private static instance: RedButton | null = null;

  private int16Value: number | undefined;

  private status: RecordingStatus = RecordingStatus.STOP; // Initial status is 'stop'

  private commandPid = 0;

  constructor(@inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess) {}

  // Function to set the Int16 value
  setInt16(value: number): void {
    this.int16Value = value;
    this.updateStatus();
  }

  // Function to check the 3rd bit of the Int16 value and update status accordingly
  private updateStatus(): void {
    if (this.int16Value === undefined) {
      // console.error('Int16 value is not set.');
      return;
    }

    // Check if the 3rd bit is high or low
    // eslint-disable-next-line no-bitwise
    const thirdBit = (this.int16Value >> 2) & 1; // Shift right by 1 and mask with 0000 0001
    // console.log(thirdBit);
    // Update status based on the 3rd bit and current status
    if (thirdBit === 1 && this.status !== RecordingStatus.RECORDING) {
      this.status = RecordingStatus.RECORDING;
      // eslint-disable-next-line no-console
      console.log('start recording...');
      // TODO execute this command
      const command = this.childProcessSvc.buildCommand(
        'roslaunch nrc_svcs record_separately.launch record_machine:=node02',
        ''
      );
      this.commandPid = this.childProcessSvc.executeAndValid(command, 3000, () => null) || 0;
      // roslaunch nrc_svcs record_separately.launch machine:=node02
    } else if (thirdBit === 0 && this.status === RecordingStatus.RECORDING) {
      this.status = RecordingStatus.STOP;
      // eslint-disable-next-line no-console
      console.log('Stop recording...');
      this.childProcessSvc.killCommandPid(this.commandPid);
      // kill the process executing the above command
    }
  }

  // Function to get the current status
  getStatus(): RecordingStatus {
    return this.status;
  }
}
