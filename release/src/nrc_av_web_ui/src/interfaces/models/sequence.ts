export interface SequenceStep {
  id: number;
  name: string;
  command: string;
}

export interface Sequence {
  id: number;
  name: string;
  steps: SequenceStep[];
}
