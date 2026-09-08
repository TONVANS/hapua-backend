import { Test, TestingModule } from '@nestjs/testing';
import { DelegationService } from './delegation.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('DelegationService', () => {
  let service: DelegationService;

  const mockPrisma = {
    delegation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    country: {
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    activity: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    activityDelegation: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DelegationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DelegationService>(DelegationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      firstName: 'Somchai',
      lastName: 'Deejai',
      email: 'somchai@test.com',
      countryId: 'country-th-id',
      organizationId: 'org-egat-id',
    };

    it('should throw ConflictException if email already in use', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if countryId is invalid', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);
      mockPrisma.country.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if organizationId is invalid', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);
      mockPrisma.country.findUnique.mockResolvedValue({
        id: 'country-th-id',
        code: 'TH',
      });
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate HAP-TH-001 when no existing delegates for country', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);
      mockPrisma.country.findUnique.mockResolvedValue({
        id: 'country-th-id',
        code: 'TH',
        name: 'Thailand',
      });
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-egat-id',
        name: 'EGAT',
      });
      mockPrisma.delegation.findMany.mockResolvedValue([]);
      mockPrisma.delegation.create.mockImplementation((args) =>
        Promise.resolve({ id: 'new-del-id', ...args.data }),
      );

      const result = await service.create(createDto);

      expect(mockPrisma.delegation.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          delegationCode: 'HAP-TH-001',
        },
      });
      expect(result.delegationCode).toBe('HAP-TH-001');
    });

    it('should increment sequence correctly to HAP-TH-003 when HAP-TH-001 and HAP-TH-002 exist', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);
      mockPrisma.country.findUnique.mockResolvedValue({
        id: 'country-th-id',
        code: 'TH',
        name: 'Thailand',
      });
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-egat-id',
        name: 'EGAT',
      });
      mockPrisma.delegation.findMany.mockResolvedValue([
        { delegationCode: 'HAP-TH-001' },
        { delegationCode: 'HAP-TH-002' },
      ]);
      mockPrisma.delegation.create.mockImplementation((args) =>
        Promise.resolve({ id: 'new-del-id', ...args.data }),
      );

      const result = await service.create(createDto);

      expect(mockPrisma.delegation.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          delegationCode: 'HAP-TH-003',
        },
      });
      expect(result.delegationCode).toBe('HAP-TH-003');
    });

    it('should handle unpadded existing code like HAP-LA1 and generate HAP-LA-002', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);
      mockPrisma.country.findUnique.mockResolvedValue({
        id: 'country-la-id',
        code: 'LA',
        name: 'Lao PDR',
      });
      mockPrisma.delegation.findMany.mockResolvedValue([
        { delegationCode: 'HAP-LA1' },
      ]);
      mockPrisma.delegation.create.mockImplementation((args) =>
        Promise.resolve({ id: 'new-del-id', ...args.data }),
      );

      const result = await service.create({
        firstName: 'Chanthaboun',
        lastName: 'Soukaloun',
        email: 'chanthaboun@edl.la',
        countryId: 'country-la-id',
      });

      expect(result.delegationCode).toBe('HAP-LA-002');
    });

    it('should fallback to HAP-GEN-001 if countryId is not provided', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);
      mockPrisma.delegation.findMany.mockResolvedValue([]);
      mockPrisma.delegation.create.mockImplementation((args) =>
        Promise.resolve({ id: 'new-del-id', ...args.data }),
      );

      const result = await service.create({
        firstName: 'Guest',
        lastName: 'User',
        email: 'guest@example.com',
      });

      expect(result.delegationCode).toBe('HAP-GEN-001');
    });
  });

  describe('registerForActivity', () => {
    const dto = { delegationCode: 'HAP-TH-001', activityId: 'act-1' };

    it('should throw NotFoundException if delegation code is invalid', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue(null);
      await expect(service.registerForActivity(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if activity not found', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({ id: 'del-1' });
      mockPrisma.activity.findFirst.mockResolvedValue(null);
      await expect(service.registerForActivity(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if activity is not UPCOMING', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({ id: 'del-1' });
      mockPrisma.activity.findFirst.mockResolvedValue({ status: 'COMPLETED' });
      await expect(service.registerForActivity(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if room capacity reached', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({ id: 'del-1' });
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: 'act-1',
        status: 'UPCOMING',
        room: { capacity: 10 },
        _count: { delegations: 10 },
      });
      await expect(service.registerForActivity(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if already registered', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({ id: 'del-1' });
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: 'act-1',
        status: 'UPCOMING',
        room: { capacity: 10 },
        _count: { delegations: 5 },
      });
      mockPrisma.activityDelegation.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.registerForActivity(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should successfully register', async () => {
      mockPrisma.delegation.findUnique.mockResolvedValue({ id: 'del-1' });
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: 'act-1',
        status: 'UPCOMING',
        room: { capacity: 10 },
        _count: { delegations: 5 },
      });
      mockPrisma.activityDelegation.create.mockResolvedValue({});

      const result = await service.registerForActivity(dto);
      expect(result).toEqual({
        message: 'Successfully registered for the activity',
      });
      expect(mockPrisma.activityDelegation.create).toHaveBeenCalledWith({
        data: { activityId: 'act-1', delegationId: 'del-1' },
      });
    });
  });
});
