import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@libs/entities/base.entity';
import { Employee } from '@libs/interfaces';
import { EmployeeRole } from '@libs/enums';

export { EmployeeRole };

@Entity('employees')
export class EmployeeEntity extends BaseEntity<Employee> {
  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'text', default: EmployeeRole.EMPLOYEE })
  role!: EmployeeRole;

  toDto(): Employee {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
    };
  }
}
