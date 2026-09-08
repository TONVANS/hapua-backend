import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    delegation: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = { email: 'admin@test.com', password: 'password123' };

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not admin', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({
        id: '1',
        email: 'admin@test.com',
        role: Role.DELEGATION,
        password: 'hashedpassword',
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({
        id: '1',
        email: 'admin@test.com',
        role: Role.ADMIN,
        password: 'wrongpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return access token on successful login', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({
        id: '1',
        email: 'admin@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.ADMIN,
        password: 'hashedpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: {
          id: '1',
          email: 'admin@test.com',
          firstName: 'John',
          lastName: 'Doe',
          role: Role.ADMIN,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      });
    });
  });
});
