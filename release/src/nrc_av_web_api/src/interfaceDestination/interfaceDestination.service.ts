import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Alias, Destination, Interface, InterfaceDestination } from '../core';
import { InterfaceDestDTO } from '../interface/dto/interfaceDestination.dto';

@Injectable()
export class InterfaceDestinationService {
  constructor(private readonly dataSource: DataSource) {}
  async addInterfaceDests(
    transactionalEntityManager: EntityManager,
    interfaceDestDTOs: InterfaceDestDTO[],
    agentInterface: Interface
  ): Promise<InterfaceDestination[]> {
    return await transactionalEntityManager.save(
      InterfaceDestination,
      interfaceDestDTOs.map((interfaceDestDTO) => ({
        name: interfaceDestDTO.name,
        destination: new Destination(
          interfaceDestDTO.posX,
          interfaceDestDTO.posY,
          interfaceDestDTO.posTh
        ),
        interface: agentInterface
      }))
    );
  }

  async updateInterfaceDests(
    currentInterfaceDests: InterfaceDestination[],
    newInterfaceDests: InterfaceDestDTO[],
    transactionalEntityManager: EntityManager,
    agentInterface: Interface
  ): Promise<InterfaceDestination[]> {
    const updatedInterfaceDests: InterfaceDestination[] = [];
    const insertedInterfaceDests: InterfaceDestination[] = [];
    newInterfaceDests.forEach((newInterfaceDest) => {
      const currentInterfaceDest = currentInterfaceDests.find(
        (currentInterfaceDest) =>
          currentInterfaceDest.interfaceId === newInterfaceDest.interface_id &&
          currentInterfaceDest.destinationId === newInterfaceDest.destination_id
      );
      if (currentInterfaceDest) {
        currentInterfaceDest.name = newInterfaceDest.name;
        currentInterfaceDest.destination.posX = newInterfaceDest.posX;
        currentInterfaceDest.destination.posY = newInterfaceDest.posY;
        currentInterfaceDest.destination.posTh = newInterfaceDest.posTh;
        updatedInterfaceDests.push(currentInterfaceDest);
        currentInterfaceDests.splice(currentInterfaceDests.indexOf(currentInterfaceDest), 1);
      } else {
        insertedInterfaceDests.push(
          new InterfaceDestination(
            newInterfaceDest.name,
            new Destination(newInterfaceDest.posX, newInterfaceDest.posY, newInterfaceDest.posTh),
            agentInterface
          )
        );
      }
    });
    currentInterfaceDests.forEach((currentInterfaceDest) => {
      currentInterfaceDest.isDeleted = true;
    });
    return (
      await transactionalEntityManager.save(
        InterfaceDestination,
        updatedInterfaceDests.concat(currentInterfaceDests)
      )
    ).concat(await transactionalEntityManager.save(InterfaceDestination, insertedInterfaceDests));
  }

  getInterfaceDests(interfaceId: number): Promise<InterfaceDestination[]> {
    return this.dataSource
      .getRepository(InterfaceDestination)
      .createQueryBuilder(Alias.INTERFACE_DESTINATIONS)
      .where({
        interface: {
          id: interfaceId
        },
        isDeleted: false
      })
      .leftJoinAndSelect(
        `${Alias.INTERFACE_DESTINATIONS}.${Alias.DESTINATION}`,
        Alias.DESTINATION,
        `${Alias.DESTINATION}.isDeleted = false`
      )
      .getMany();
  }
}
