import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') orderId: string;
  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'orderId' })
  order: Order;
  @Column('uuid') productId: string;
  @Column() productName: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) productPrice: number;
  @Column('int') quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) subtotal: number;
}
