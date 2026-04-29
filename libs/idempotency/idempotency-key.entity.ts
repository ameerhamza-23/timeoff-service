import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKeyEntity {
  @PrimaryColumn()
  key!: string;

  @Column()
  requestId!: string;

  @Column({ type: 'text' })
  responseSnapshot!: string;

  @Column({ type: 'datetime' })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
