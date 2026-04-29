import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@libs/entities/base.entity';
import { TimeOffRequest } from '@libs/interfaces';
import { TimeOffStatus } from '@libs/enums';
import { EmployeeEntity } from '../employee/employee.entity';

export { TimeOffStatus };

@Entity('timeoff_requests')
export class TimeOffRequestEntity extends BaseEntity<TimeOffRequest> {
  @Column()
  employeeId!: string;

  @ManyToOne(() => EmployeeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee!: EmployeeEntity;

  @Column()
  locationId!: string;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ type: 'float' })
  days!: number;

  @Column({ type: 'text', default: TimeOffStatus.PENDING })
  status!: TimeOffStatus;

  // Client-supplied key to prevent duplicate submissions
  @Column({ unique: true })
  idempotencyKey!: string;

  toDto(): TimeOffRequest {
    return {
      id: this.id,
      employeeId: this.employeeId,
      locationId: this.locationId,
      startDate: this.startDate,
      endDate: this.endDate,
      days: this.days,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}
