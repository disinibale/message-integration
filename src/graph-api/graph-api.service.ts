import { HttpException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class GraphApiService {

    private baseApi: string
    private appId: string
    private appSecret: string

    constructor(
        private configService: ConfigService
    ) {
        this.baseApi = `${configService.get<string>('FACEBOOK_API_URL')}/${configService.get<string>('FACEBOOK_API_VER')}`
        this.appId = configService.get<string>('FACEBOOK_APP_ID')
        this.appSecret = configService.get<string>('FACEBOOK_APP_SECRET')
    }

    async getUserProfile(userAccessToken: string) {
        try {
            const response = await axios.get(`${this.baseApi}/me?fields=id,name,email,picture`, {
                params: {
                    access_token: userAccessToken
                }
            })

            return response.data
        } catch (e) {
            return e
        }
    }

    async getSenderProfile(pageAccessToken: string, userId: string) {
        try {
            const response = await axios.get(`${this.baseApi}/${userId}?fields=name,picture&access_token=${pageAccessToken}`)

            return response.data
        } catch (e) {
            return e
        }
    }

    async getUserPages(userAccessToken: string) {
        try {
            const response = await axios.get(`${this.baseApi}/me/accounts?fields=name,access_token`, {
                params: {
                    access_token: userAccessToken
                }
            })

            return response.data
        } catch (e) {
            return e
        }
    }

    async getSingleUserPage(pageId: string, userAccessToken: string) {
        try {
            const response = await axios.get(`${this.baseApi}/${pageId}&fields=id,name`, {
                params: {
                    access_token: userAccessToken
                }
            })

            return response.data
        } catch (e) {
            return e
        }
    }

    async generateLongAccessToken(userAccessToken: string) {
        try {
            const url = `${this.baseApi}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${userAccessToken}`
            const response = await axios.get(url)

            return response.data
        } catch (e) {
            return e
        }
    }

    async subscribeWebhook(pageId: string, pageAccessToken: string) {
        try {
            const subscribedApps = 'feed,messages,mention,inbox_labels,message_deliveries,message_echoes,message_reactions,message_reads,messaging_account_linking,messaging_optins,messaging_policy_enforcement,messaging_referrals'
            const response = await axios.post(`https://graph.facebook.com/${pageId}/subscribed_apps?subscribed_fields=${subscribedApps}&access_token=${pageAccessToken}`)

            return response.data
        } catch (e) {
            return e
        }
    }

    async sendMessage(to: string, platform: string, message: string, pageAccessToken: string) {
        if (platform === 'facebook') {
            try {
                const url = `${this.baseApi}/me/messages?access_token=${pageAccessToken}`
                const response = await axios.post(url, JSON.stringify({
                    messaging_tag: "MESSAGE_TAG",
                    tag: "HUMAN_AGENT",
                    recipient: {
                        id: to
                    },
                    message: {
                        text: message
                    }
                }), {
                    headers: {
                        'Content-Type': 'application/json'
                    }                    
                })
    
                return response.data
            } catch (e) {
                return e
            }
        } else if (platform === 'instagram') {
            return 'Wakwaw'
        }
    }

}
