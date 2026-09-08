import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: PrismaService;

  const mockPrisma = {
    activity: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAgenda', () => {
    it('should group activities by date', async () => {
      const mockActivities = [
        {
          id: '1',
          name: 'Day 1 Opening',
          description: 'Opening session',
          date: new Date('2024-01-01T00:00:00Z'),
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T12:00:00Z'),
          status: 'UPCOMING',
          room: { id: 'r1', name: 'Main Hall', location: 'Floor 1', capacity: 100 },
        },
        {
          id: '2',
          name: 'Day 1 Afternoon Session',
          description: 'Afternoon session',
          date: new Date('2024-01-01T00:00:00Z'),
          startTime: new Date('2024-01-01T13:00:00Z'),
          endTime: new Date('2024-01-01T16:00:00Z'),
          status: 'UPCOMING',
          room: { id: 'r1', name: 'Main Hall', location: 'Floor 1', capacity: 100 },
        },
        {
          id: '3',
          name: 'Day 2 Morning Session',
          description: 'Morning session',
          date: new Date('2024-01-02T00:00:00Z'),
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T12:00:00Z'),
          status: 'UPCOMING',
          room: { id: 'r2', name: 'Room B', location: 'Floor 2', capacity: 50 },
        },
      ];

      mockPrisma.activity.findMany.mockResolvedValue(mockActivities);

      const agenda = await service.getAgenda();

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { status: { not: 'CANCELED' } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          room: {
            select: {
              id: true,
              name: true,
              location: true,
              capacity: true,
            },
          },
        },
      });

      expect(agenda).toEqual({
        '2024-01-01': [
          { ...mockActivities[0], status: 'COMPLETED' },
          { ...mockActivities[1], status: 'COMPLETED' },
        ],
        '2024-01-02': [{ ...mockActivities[2], status: 'COMPLETED' }],
      });
    });

    it('should return empty object if no activities', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      const agenda = await service.getAgenda();
      expect(agenda).toEqual({});
    });
  });
});
