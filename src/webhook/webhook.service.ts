import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable, HttpCode } from '@nestjs/common';
import { Repository } from 'typeorm'
import { FacebookSubscription } from 'src/shared/entities/facebook-subscription.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { GraphApiService } from 'src/graph-api/graph-api.service'
import { RoomsService } from '../rooms/rooms.service'
import { ChatsService } from 'src/chats/chats.service'

@Injectable()
export class WebhookService {
    @InjectRepository(FacebookSubscription)
    private readonly repository: Repository<FacebookSubscription>
    private verifyToken

    constructor(
        private configService: ConfigService,
        private graphApi: GraphApiService,
        private roomService: RoomsService,
        private messageService: ChatsService
    ) {
        this.verifyToken = configService.get('WEBHOOK_VERIFY_TOKEN')
    }

    /**
     * 
     * @param query 
     * @returns Hub Challenge for Facebook webhook
     * 
     */
    get(
        query: {
            'hub.mode': string,
            'hub.verify_token': string,
            'hub.challenge': string,
        }
    ): any {
        const mode = query['hub.mode']
        const token = query['hub.verify_token']
        const challenge = query['hub.challenge']

        if (mode && token) {
            if (mode === 'subscribe' && token === this.verifyToken) {
                console.log('Webhook Verified')
                return challenge
            }
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
        }
    }

    /**
     * 
     * @param body 
     * @returns Webhook body from facebook subscriptions & Insert The Webhook Data To Database 
     * 
     */
    post(body) {
        if (body.object === 'page') {

            body.entry.forEach((entry) => {
                if ('changes' in entry) {
                    if (entry.changes[0].field === 'feed') {
                        const change = entry.changes[0].value
                        if (change.item === 'post') console.log('Incoming Post')
                        if (change.item === 'comment') console.log('Incoming Message')
                    }
                }

                if ('messaging' in entry) {
                    entry.messaging.forEach(async (event) => {
                        if ('message' in event) {
                            const channel = 'Facebook'
                            const senderId = event.sender.id
                            const recipientId = event.recipient.id
                            const messageTimestamp = event.timestamp
                            const messageContent = event.message.text
                            const messageId = event.message.mid
                            const subs = await this.repository.findOne({
                                where: {
                                    pageId: recipientId.toString()
                                }
                            })

                            console.log(event)
                            // console.log(subs)
                            // console.log(channel, entity, senderId, recipientId, messageTimestamp, messageContent, messageId, subs )

                            if (subs) {
                                const instanceId = subs.instanceId
                                const subId = subs.subId
                                const pageAccessToken = subs.pageAccessToken
                                const senderProfile = await this.graphApi.getSenderProfile(pageAccessToken, senderId)
                                const room = await this.roomService.getRoom(subId, instanceId, senderId.toString())
                                
                                const data = this.insertData({
                                    senderId,
                                    senderName: senderProfile.name,
                                    senderAvatar: senderProfile.picture.data.url,
                                    recipientId,
                                    recipientName: subs.pageName,
                                    recipientAvatar: subs.pagePicture,
                                    profilePicture: senderProfile.picture.data.url,
                                    instanceId,
                                    subId,
                                    messageId,
                                    messageTimestamp,
                                    messageContent,
                                    channel,
                                    unreplied: true,
                                    fromMe: false
                                })
                                
                                const messagePayload = this.insertMessageData({
                                    instanceId,
                                    clientId: senderId,
                                    clientName: senderProfile.name,
                                    senderId: senderId,
                                    roomId: data.roomId,
                                    message: messageContent,
                                    originalMessage: data.lastMessage.original_message,
                                    sourceId: messageId,
                                    fromMe: false
                                })

                                if (room) {
                                    console.log('Room Exist, Updating Data')
                                    const update = await this.roomService.updateRoom(subId, instanceId, data)

                                    if ('affected' in update) {
                                        const message = await this.messageService.saveMessages(subId, messagePayload)
                                        console.log(message)
                                        return message
                                    }

                                    return update
                                } else {
                                    console.log('Room Empty, Insert Data Instead')
                                    const insert = await this.roomService.saveRoom(subId, data)

                                    const message = await this.messageService.saveMessages(subId, messagePayload)

                                    console.log(message)
                                    console.log(insert)
                                    return insert
                                }
                            }
                        }

                        // Got a read event
                        // if ('read' in event) return console.log('Got a read message')
                        // Got a deliver event
                        // if ('delivery' in event) return console.log('Got a delivery message')
                    })
                }
            });
        
            // Don't Delete 
            return new HttpException('Event Received', HttpStatus.OK)
        }

        if (body.object === 'instagram') {

            body.entry.forEach((entry) => {

                if ('changes' in entry) {
                    entry.changes.forEach(event => {
                        if (event.field === 'comments') return console.log('Comment')
                        if (event.field === 'mentions') return console.log('Mentions')
                    });
                }

                if ('messaging' in entry) {
                    console.log('Pesan masuk')
                    entry.messaging.forEach(event => {
                        console.log(event)
                    });
                }
            })

            return new HttpException('Instagram Event Received', HttpStatus.OK)
        }

        throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    }

    /**
     * 
     * @param query 
     * @param body 
     * @returns Profile, Long Access Token, Page and Instance Id
     *  
     */
    async register(
        query: {
            userAccessToken: string,

        },
        body: {
            subId: string,
            instanceId: string,
            page: {
                id: string,
                accessToken: string,
                name: string
            }
        }
    ) {
        const userAccessToken = query.userAccessToken
        const instanceId = body.instanceId
        const subId = body.subId
        const page = body.page
        console.log({ userAccessToken, instanceId, subId, page }, 'Wakwaw')
        try {
            const profile = await this.graphApi.getUserProfile(userAccessToken)
            const longAccessToken = await this.graphApi.generateLongAccessToken(userAccessToken)
            const longPageAccessToken = await this.graphApi.generateLongAccessToken(page.accessToken)

            console.log(longPageAccessToken)

            const data = {
                instanceId,
                subId,
                userId: profile.id,
                userAccessToken: longAccessToken.access_token,
                pageId: page.id,
                pageAccessToken: longPageAccessToken.access_token,
                pageName: page.name,
                ownerName: profile.name,
                pagePicture: profile.picture.data.url
            }

            console.log(data)

            const subscribePage = await this.graphApi.subscribeWebhook(data.pageId, longPageAccessToken.access_token)
            const subs = await this.repository.findOne({ where: { pageId: data.pageId } })
            const response = { profile, longAccessToken, page, subscribePage }

            if (!subs) {
                const room = await this.repository.save(data)

                console.log({ ...response, subs: room })
                return { ...response, subs: room }
            } else {
                const room = await this.repository.createQueryBuilder()
                    .update(FacebookSubscription)
                    .set({
                        userAccessToken: data.userAccessToken,
                        pageAccessToken: data.pageAccessToken,
                        pagePicture: data.pagePicture
                    })
                    .where('pageId = :pageId', { pageId: data.pageId })
                    .returning('*')
                    .execute()

                console.log({ ...response, subs: room })
                return { ...response, subs: room.raw }
            }
        } catch (e) {
            return e
        }
    }


    // Handling Function
    testing(query: { pageAccessToken: string, userId: string }) {
        return this.graphApi.getSenderProfile(query.pageAccessToken, query.userId)
    }

    insertData(
        data: {
            senderId: string,
            senderName: string,
            senderAvatar: string,
            recipientId: string,
            recipientName: string,
            recipientAvatar: string,
            profilePicture: string,
            instanceId: string,
            subId: string,
            messageId: string,
            messageTimestamp: string,
            messageContent: string,
            channel: string,
            unreplied: boolean,
            fromMe: boolean
        }
    ) {
        const timestamp = new Date().getTime()
        const responseData = {
            phone_number: data.senderId,
            name: data.senderName,
            phone_number_show: data.senderId,
            profile_picture: data.profilePicture,
            instance_id: data.instanceId,
            sync_firestore: false,
            unread_count: 0,
            roomId: `${data.instanceId}-${data.senderId}`,
            pinned: false,
            last_interaction: null,
            assign_to: null,
            archived: false,
            roomStatus: "on_queue",
            unreplied: false,
            last_reply: data.messageTimestamp,
            last_message: timestamp,
            lastMessage: {
                data: {
                    operator: 'Send via Facebook Messenger'
                },
                seen: false,
                files: [],
                fromMe: data.fromMe,
                content: data.messageContent,
                seen_by: [],
                sender_id: data.senderId,
                source_id: data.messageId,
                timestamp: {
                    _seconds: Math.floor(timestamp / 1000).toString(),
                    _nanoseconds: 0
                },
                distributed: true,
                sender_name: data.senderId,
                original_message: {
                    id: data.messageId,
                    type: "message_create",
                    message_create: {
                        target: {
                            recipient_id: data.recipientId
                        },
                        sender_id: data.senderId,
                        message_data: {
                            text: data.messageContent,
                            entities: {
                                urls: [],
                                symbols: [],
                                hashtags: [],
                                user_mentions: []
                            }
                        }
                    },
                    created_timestamp: data.messageTimestamp
                },
                content_notification: "New Incoming Message"
            },
            message_from_me: 0,
            roomName: data.senderName,
            roomOwnerId: data.recipientId,
            roomOwnerName: data.recipientName,
            subId: data.subId,
            users: [
                {
                    _id: data.recipientId,
                    avatar: data.recipientAvatar,
                    status: null,
                    username: data.recipientId
                },
                {
                    _id: data.senderId,
                    avatar: data.senderAvatar,
                    status: null,
                    username: data.senderId
                }
            ],
            channel_source: data.channel,
            last_message_status: null
        }

        return responseData
    }

    insertMessageData(data: {
        instanceId: string,
        clientId: string,
        clientName: string,
        senderId: string,
        roomId: string,
        message: string,
        originalMessage: any,
        sourceId: string,
        fromMe: boolean        
    }) {
        const timestamp = new Date().getTime()
        return {
            chatId: `${data.instanceId}-${data.sourceId}`,
            dbRoomId: data.roomId,
            content: data.message,
            files: [],
            original_message: {
                key: {
                    id: data.sourceId,
                    fromMe: data,  
                    remoteJid: ''
                },
                labels: [],
                message: {
                    conversation: data.message
                },
                userData: {
                    id: data.senderId,
                    name: data.clientName,
                    verifiedName: '',
                },
                reactions: [],
                pullUpdates: [],
                userReceipt: [],
                messageTimestamp: {
                    low: Math.floor(timestamp / 1000),
                    high: 0,
                    unsigned: true
                },
                messageStubParameter: []
            },
            data: {
                operator: 'Send via Facebook Messenger'
            },
            source_id: data.sourceId,
            fromMe: data.fromMe,
            deleted: null,
            sender_id: data.clientId,
            sender_name: data.clientName,
            timestamp: {
                _seconds: Math.floor(timestamp / 1000),
                _nanoseconds: 0
            },
            distributed: true,
            seen: false,
            seen_by: [],
            replyMessage: null,
            content_notification: null,
            couch_timestamp: timestamp,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    }

    async handleSendMessage(
        body: { to: string, platform: string, message: string, pageAccessToken: string },
        query: { instanceId: string, subId: string }
    ) { 
        try {
            const message = await this.graphApi.sendMessage(body.to, body.platform, body.message, body.pageAccessToken)
            console.log(message)
            if ('recipient_id' in message) {
                const room = await this.roomService.getRoom(query.subId, query.instanceId, message.recipient_id)
                const clientProfile = await this.graphApi.getSenderProfile(body.pageAccessToken, room.phone_number)
                const clientId = message.recipient_id
                const clientName = clientProfile.name
                const clientPicture = clientProfile.picture.data.url
                const timestamp = new Date().getTime().toString()
                const subs = await this.repository.findOne({
                    where: {
                        instanceId: query.instanceId
                    }
                })

                // return subs
                // console.log(subs)

                const roomPayload = this.insertData({
                    senderId: clientId,
                    senderName: clientName,
                    senderAvatar: clientPicture,
                    recipientId: subs.pageId,
                    recipientName: subs.pageName,
                    recipientAvatar: subs.pagePicture,
                    profilePicture: clientPicture,
                    instanceId: query.instanceId,
                    subId: subs.subId,
                    messageId: message.message_id,
                    messageTimestamp: timestamp,
                    messageContent: body.message,
                    channel: body.platform,
                    unreplied: true,
                    fromMe: true
                })

                // console.log(roomPayload)
                
                const messagePayload = this.insertMessageData({ 
                    instanceId: query.instanceId, 
                    clientId: subs.pageId, 
                    clientName: subs.pageName, 
                    senderId: roomPayload.phone_number,
                    roomId: roomPayload.roomId, 
                    message: body.message, 
                    originalMessage: roomPayload.lastMessage.original_message, 
                    sourceId: roomPayload.lastMessage.source_id, 
                    fromMe: true 
                })

                if (room) {
                    console.log('Room found, Updating data')
                    const updated = await this.roomService.updateRoom(query.subId, query.instanceId, roomPayload)
                    if ('affected' in updated) {
                        const message = await this.messageService.saveMessages(query.subId, messagePayload)
                        console.log(message)
                        return message
                    }
                }

                return roomPayload
            } else {
                throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
            }
        } catch (e) {
            return e
        }
    }    
}
