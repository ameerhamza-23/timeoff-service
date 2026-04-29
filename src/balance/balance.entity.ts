import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { EmployeeEntity } from '../employee/employee.entity';
import { Balance } from '@libs/interfaces';

@Entity('balances')
export class BalanceEntity {
  @PrimaryColumn()
  employeeId!: string;

  @PrimaryColumn()
  locationId!: string;

  @ManyToOne(() => EmployeeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee!: EmployeeEntity;

  @Column({ type: 'float', default: 0 })
  availableDays!: number;

  @Column({ type: 'float', default: 0 })
  usedDays!: number;

  // Optimistic locking — incremented on every write
  @VersionColumn()
  version!: number;

  @Column({ type: 'datetime', nullable: true })
  hcmSyncedAt!: Date | null;

  @UpdateDateColumn()
  updatedAt!: Date;

  toDto(): Balance {
    return {
      employeeId: this.employeeId,
      locationId: this.locationId,
      availableDays: this.availableDays,
      usedDays: this.usedDays,
    };
  }
}
