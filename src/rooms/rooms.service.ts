import { ConfigService } from '@nestjs/config';
import { RoomEntity } from './../shared/entities/rooms.entity';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from 'typeorm';

@Injectable()
export class RoomsService {
    @InjectRepository(RoomEntity)
    private readonly repository: Repository<RoomEntity>

    async getRoom(subId: string, instanceId: string, senderId: string) {
        this.repository.metadata.tablePath = `${subId}_rooms`
        const rooms = await this.repository.findOne({
            where: {
                roomId: `${instanceId}-${senderId}`
            }
        })
        return rooms
    }

    async saveRoom(
        subId: string,
        data: any
    ) {
        this.repository.metadata.tablePath = `${subId}_rooms`
        return await this.repository.save(data)
    }

    async updateRoom(
        subId: string,
        instanceId: string,
        data: any
    ) {
        this.repository.metadata.tablePath = `${subId.toLowerCase()}_rooms`
        const room = await this.repository.createQueryBuilder()
            .update(RoomEntity)
            .set(data).where('instance_id = :id', { id: instanceId })
            .execute()
        return room
    }

    async upsert(subId: string, instanceId: string, data: any) {
        const room = this.getRoom(subId, instanceId, data)

        if (!room) {
            return this.updateRoom(subId, instanceId, data)
        }

        return this.saveRoom(subId, data)
    }

}