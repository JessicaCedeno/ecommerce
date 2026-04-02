import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const exists = await this.userRepository.findOne({ where: { email: dto.email } });
    if (exists) {
      this.logger.warn(`Registration attempt with existing email: ${dto.email}`);
      throw new ConflictException('Email already registered');
    }
    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepository.create({ email: dto.email, password: hashed });
    const saved = await this.userRepository.save(user);
    this.logger.log(`New user registered: ${saved.id}`);
    return { id: saved.id, email: saved.email };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password'],
    });
    if (!user) {
      this.logger.warn(`Failed login attempt — email not found: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      this.logger.warn(`Failed login attempt — wrong password for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, email: user.email };
    this.logger.log(`User logged in: ${user.id}`);
    return { accessToken: this.jwtService.sign(payload) };
  }
}
