import { Ros, Topic } from 'roslib';
import * as constants from '../../shared/constants';

export default abstract class ROSHandler<T> {
  protected data = {};

  protected name: string;

  protected ros: Ros;

  constructor(private topicName: string, protected rosConnection: Ros) {
    this.data = {};
    this.name = topicName;
    this.ros = rosConnection;
  }

  protected abstract handleMessage(message: T): void;

  // eslint-disable-next-line require-await
  private async getTopicType(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.ros.getTopicType(this.topicName, (type) => {
        resolve(type);
      });
    });
  }

  private async subscribeToTopicWithPolling() {
    const type = await this.getTopicType();
    if (type) {
      this.subscribeToTopic(type);
    } else {
      // Most likely topic hasn't finished initializing yet, we will poll for it
      const topicPolling = setInterval(async () => {
        const typePolling = await this.getTopicType();
        if (typePolling) {
          clearInterval(topicPolling);
          this.subscribeToTopic(typePolling);
        }
      }, constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_POLL_INTERVAL);
    }
  }

  protected subscribeToTopic(type: string) {
    const topic = new Topic({
      ros: this.ros,
      name: this.name,
      messageType: type
    });
    topic.subscribe((message: any) => this.handleMessage(message));
  }

  public async subscribe() {
    await this.subscribeToTopicWithPolling();
  }

  public getData() {
    return this.data;
  }
}
