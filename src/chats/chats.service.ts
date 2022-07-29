import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from '../shared/entities/messages.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatsService {
    @InjectRepository(MessageEntity)
    private readonly repository: Repository<MessageEntity>

    async getMessages(subId: string, dbRoomId: string) {
        this.repository.metadata.tablePath = `${subId}_messages`

        return await this.repository.find({
            where: {
                dbRoomId
            }
        })
    }

    async saveMessages(subId: string, data: any) {
        this.repository.metadata.tablePath = `${subId}_messages`

        const message = this.repository.create(data)
        return await this.repository.insert(message)
    }

    async updateMessage(
        subId: string,
        instanceId: string,
        data: MessageEntity) 
    {
        this.repository.metadata.tablePath = `${subId}_messages`

        const room = this.repository.createQueryBuilder()
                                    .update(MessageEntity)
                                    .set(data).where('instance_id = :id', { id: instanceId })
                                    .execute()
        
        return room
    }

}
