import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Destination } from '../core';
import { DestinationDTO } from '../interface/dto/destination.dto';

@Injectable()
export class DestinationService {
  async addDests(
    transactionalEntityManager: EntityManager,
    destDTOs: DestinationDTO[]
  ): Promise<Destination[]> {
    return await transactionalEntityManager.save(Destination, destDTOs);
  }

  updateDests(currentDests: Destination[], newDests: DestinationDTO[]): Destination[] {
    const updatedDests: Destination[] = [];
    newDests.forEach((newDest) => {
      const currentDest = currentDests.find((currentDest) => currentDest.id === newDest.id);
      if (currentDest) {
        currentDest.posX = newDest.posX;
        currentDest.posY = newDest.posY;
        currentDest.posTh = newDest.posTh;
        updatedDests.push(currentDest);
        currentDests.splice(currentDests.indexOf(currentDest), 1);
      } else {
        updatedDests.push(new Destination(newDest.posX, newDest.posY, newDest.posTh));
      }
    });
    currentDests.forEach((currentDest) => {
      currentDest.isDeleted = true;
    });
    return updatedDests.concat(currentDests);
  }
}
