import { Controller, Get, Post, Query, Body, HttpCode } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook') // localhost:5000/webhook
export class WebhookController {

    constructor(
        private webhookService: WebhookService
    ) { }

    @Get()
    @HttpCode(200)
    getWebhook(
        @Query() query: {
            "hub.mode": string,
            "hub.verify_token": string,
            "hub.challenge": string
        }
    ) {
        return this.webhookService.get(query)
    }

    @Post()
    postWebhook(
        @Body() body
    ) {
        return this.webhookService.post(body)
    }

    @Post('register')
    registerFacebook(
        @Query() query: {
            userAccessToken: string
        },
        @Body() body: {
            subId: string,
            instanceId: any,
            page: {
                id: string,
                accessToken: string,
                name: string
            }
        }
    ) {
        return this.webhookService.register(query, body)
    }

    @Post('test')
    testing(
        @Body() body: {
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
            channel: string
        }
    ) {
        // return this.webhookService.insertData(body)
        console.log(body)
    }

    @Get('user-profile')
    users(
        @Query() query: { pageAccessToken: string, userId: string }) {
        return this.webhookService.testing(query)
    }

    @Post('send-message')
    send(
        @Body() body: { to: string, platform: string, message: string, pageAccessToken: string },
        @Query() query: { instanceId: string, subId: string }
    ) {
        return this.webhookService.handleSendMessage(body, query)
    }

}
