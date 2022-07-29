import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class FacebookSubscription {

    @Column({ type: 'varchar', length: 255, nullable: true, primary: true })
    public instanceId: string
    
    @Column({ type: 'varchar', length: 255, nullable: true })
    public subId: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    public userId: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    public userAccessToken: string

    @Column({ type: 'varchar', length: 255, primary: true })
    public pageId: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    public pageAccessToken: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    public pageName: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    public ownerName: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    public pagePicture: string

    @CreateDateColumn({ type: 'timestamp' })
    public createdAt: Date

    @UpdateDateColumn({ type: 'timestamp' })
    public updatedAt: Date

}