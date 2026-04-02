import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './user.entity';

jest.mock('bcrypt');

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-uuid-1',
  email: 'user@example.com',
  password: 'hashed_password',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    it('registers a new user and returns id and email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      const user = makeUser();
      mockUserRepository.create.mockReturnValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.register({
        email: 'user@example.com',
        password: 'Secret123!',
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('Secret123!', 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'hashed_password',
      });
      expect(result).toEqual({ id: user.id, email: user.email });
    });

    it('throws ConflictException when email is already registered', async () => {
      mockUserRepository.findOne.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'user@example.com', password: 'Secret123!' }),
      ).rejects.toThrow(ConflictException);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException with correct message', async () => {
      mockUserRepository.findOne.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'user@example.com', password: 'Secret123!' }),
      ).rejects.toThrow('Email already registered');
    });

    it('does not expose the hashed password in the response', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      const user = makeUser();
      mockUserRepository.create.mockReturnValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.register({
        email: 'user@example.com',
        password: 'Secret123!',
      });

      expect(result).not.toHaveProperty('password');
    });
  });

  // ── login ────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns an access token when credentials are valid', async () => {
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login({
        email: 'user@example.com',
        password: 'Secret123!',
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        select: ['id', 'email', 'password'],
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('Secret123!', user.password);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
      });
      expect(result).toEqual({ accessToken: 'jwt_token' });
    });

    it('throws UnauthorizedException when email does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noone@example.com', password: 'Secret123!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException with generic message when email not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noone@example.com', password: 'Secret123!' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(makeUser());
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'user@example.com', password: 'WrongPass1!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException with generic message when password is wrong', async () => {
      mockUserRepository.findOne.mockResolvedValue(makeUser());
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'user@example.com', password: 'WrongPass1!' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
