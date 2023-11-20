import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Alias, SubSystemType, Topic } from '../core';
import { TopicDTO } from '../interface/dto/topic.dto';

@Injectable()
export class TopicService {
  constructor(private readonly dataSource: DataSource) {}

  //@TODO Handle edit for future DTO (normalRate)
  updateTopics(currentTopics: Topic[], newTopics: TopicDTO[]): Topic[] {
    const updatedTopics: Topic[] = [];
    newTopics.forEach((newTopic) => {
      const currentTopic = currentTopics.find((currentTopic) => currentTopic.id === newTopic.id);
      if (currentTopic) {
        currentTopic.name = newTopic.name;
        currentTopic.topicName = newTopic.topicName;
        currentTopic.topicType = newTopic.topicType;
        if (newTopic.normalRate && newTopic.normalRate !== null) {
          currentTopic.normalRate = newTopic.normalRate;
        }
        currentTopic.warnRate = newTopic.warnRate;
        currentTopic.errRate = newTopic.errRate;
        updatedTopics.push(currentTopic);
        currentTopics.splice(currentTopics.indexOf(currentTopic), 1);
      } else {
        updatedTopics.push(
          new Topic(
            newTopic.name,
            newTopic.topicName,
            newTopic.topicType,
            10.0,
            newTopic.errRate,
            newTopic.warnRate
          )
        );
      }
    });
    currentTopics.forEach((currentTopic) => {
      currentTopic.isDeleted = true;
    });
    return updatedTopics.concat(currentTopics);
  }

  async getTopics(interfaceId: number, topicType: SubSystemType): Promise<Topic[]> {
    const topics = await this.dataSource.getRepository(Topic).find({
      where: {
        subSystem: {
          interface: {
            id: interfaceId
          },
          type: topicType
        },
        isDeleted: false
      }
    });

    return topics;
  }

  async getAllTopicsWithRelation(interfaceId: number): Promise<Topic[]> {
    const topics = await this.dataSource.getRepository(Topic).find({
      where: {
        subSystem: {
          interface: {
            id: interfaceId
          }
        },
        isDeleted: false
      },
      relations: [Alias.SUBSYSTEM]
    });

    return topics;
  }

  async mapTopic(interfaceId: number, topicDtoArr: TopicDTO[]): Promise<Map<number, TopicDTO[]>> {
    const topicList = await this.getAllTopicsWithRelation(interfaceId);
    const topicMap = new Map<number, TopicDTO[]>();
    topicList.forEach((topic) => {
      const currentTopic = topicDtoArr.find((currentTopic) => currentTopic.id === topic.id);
      if (currentTopic) {
        if (topicMap.has(topic.subSystem.id)) {
          const topicArr = topicMap.get(topic.subSystem.id);
          topicArr.push(currentTopic);
          topicMap.set(topic.subSystem.id, topicArr);
        } else {
          topicMap.set(topic.subSystem.id, [currentTopic]);
        }
      }
    });
    return topicMap;
  }
}
