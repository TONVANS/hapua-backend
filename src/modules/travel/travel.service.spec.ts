import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TravelService } from './travel.service';
import { MediaService } from '../gallery/media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaType, Weekday } from '../../generated/prisma';

describe('TravelService', () => {
  let service: TravelService;

  const mockPrismaService = {
    travelRecommend: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    travelImage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockMediaService = {
    processAndSave: jest.fn(),
    deleteFileByUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<TravelService>(TravelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCoverFile: Express.Multer.File = {
      fieldname: 'coverImage',
      originalname: 'waterfall.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 2048,
      buffer: Buffer.from('cover-data'),
      destination: '',
      filename: '',
      path: '',
      stream: null as unknown as NodeJS.ReadableStream,
    };

    const mockGalleryFile: Express.Multer.File = {
      fieldname: 'images',
      originalname: 'pool1.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('gallery-data'),
      destination: '',
      filename: '',
      path: '',
      stream: null as unknown as NodeJS.ReadableStream,
    };

    it('should create travel recommendation with uploaded cover image and gallery images using nested write', async () => {
      mockMediaService.processAndSave
        .mockResolvedValueOnce({
          filename: 'waterfall.webp',
          mediaUrl: '/api/media/waterfall.webp',
          mediaType: MediaType.IMAGE,
        })
        .mockResolvedValueOnce({
          filename: 'pool1.webp',
          mediaUrl: '/api/media/pool1.webp',
          mediaType: MediaType.IMAGE,
        });

      const expectedTravel = {
        id: 'travel-1',
        placeName: 'Kuang Si Waterfalls',
        location: 'Luang Prabang',
        openDays: [Weekday.MONDAY, Weekday.SUNDAY],
        coverImage: '/api/media/waterfall.webp',
        images: [{ id: 'img-1', imageUrl: '/api/media/pool1.webp', order: 0 }],
      };

      mockPrismaService.travelRecommend.create.mockResolvedValue(
        expectedTravel,
      );

      const result = await service.create(
        {
          placeName: 'Kuang Si Waterfalls',
          location: 'Luang Prabang',
          openDays: [Weekday.MONDAY, Weekday.SUNDAY],
          openTime: '08:00',
          closeTime: '17:30',
        },
        {
          coverImage: [mockCoverFile],
          images: [mockGalleryFile],
        },
      );

      expect(result).toEqual(expectedTravel);
      expect(mockMediaService.processAndSave).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.travelRecommend.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          placeName: 'Kuang Si Waterfalls',
          location: 'Luang Prabang',
          coverImage: '/api/media/waterfall.webp',
          images: {
            create: [{ imageUrl: '/api/media/pool1.webp', order: 0 }],
          },
        }),
        include: { images: { orderBy: { order: 'asc' } } },
      });
    });

    it('should clean up newly uploaded files if database creation fails', async () => {
      mockMediaService.processAndSave.mockResolvedValue({
        filename: 'waterfall.webp',
        mediaUrl: '/api/media/waterfall.webp',
        mediaType: MediaType.IMAGE,
      });

      mockPrismaService.travelRecommend.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.create(
          { placeName: 'Fail Place', location: 'Vientiane' },
          { coverImage: [mockCoverFile] },
        ),
      ).rejects.toThrow('Database error');

      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/waterfall.webp',
      );
    });
  });

  describe('findOne', () => {
    it('should return travel recommendation with images', async () => {
      const mockTravel = {
        id: 'travel-1',
        placeName: 'Kuang Si Waterfalls',
        images: [],
      };
      mockPrismaService.travelRecommend.findUnique.mockResolvedValue(mockTravel);

      const result = await service.findOne('travel-1');
      expect(result).toEqual(mockTravel);
      expect(mockPrismaService.travelRecommend.findUnique).toHaveBeenCalledWith({
        where: { id: 'travel-1' },
        include: { images: { orderBy: { order: 'asc' } } },
      });
    });

    it('should throw NotFoundException if travel info not found', async () => {
      mockPrismaService.travelRecommend.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should replace cover image and delete old cover file', async () => {
      const existingTravel = {
        id: 'travel-1',
        placeName: 'Kuang Si',
        coverImage: '/api/media/old-cover.webp',
        images: [],
      };
      mockPrismaService.travelRecommend.findUnique.mockResolvedValue(
        existingTravel,
      );
      mockMediaService.processAndSave.mockResolvedValue({
        filename: 'new-cover.webp',
        mediaUrl: '/api/media/new-cover.webp',
        mediaType: MediaType.IMAGE,
      });

      const updatedTravel = {
        ...existingTravel,
        coverImage: '/api/media/new-cover.webp',
      };
      mockPrismaService.travelRecommend.update.mockResolvedValue(updatedTravel);

      const mockNewCoverFile = {
        buffer: Buffer.from('new-cover'),
      } as Express.Multer.File;

      const result = await service.update(
        'travel-1',
        {},
        { coverImage: [mockNewCoverFile] },
      );

      expect(result.coverImage).toBe('/api/media/new-cover.webp');
      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/old-cover.webp',
      );
    });
  });

  describe('remove', () => {
    it('should delete travel recommendation and physical files from storage', async () => {
      const existingTravel = {
        id: 'travel-1',
        placeName: 'Kuang Si',
        coverImage: '/api/media/cover.webp',
        images: [
          { id: 'img-1', imageUrl: '/api/media/gallery1.webp' },
          { id: 'img-2', imageUrl: '/api/media/gallery2.webp' },
        ],
      };
      mockPrismaService.travelRecommend.findUnique.mockResolvedValue(
        existingTravel,
      );
      mockPrismaService.travelRecommend.delete.mockResolvedValue(
        existingTravel,
      );

      await service.remove('travel-1');

      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/cover.webp',
      );
      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/gallery1.webp',
      );
      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/gallery2.webp',
      );
      expect(mockPrismaService.travelRecommend.delete).toHaveBeenCalledWith({
        where: { id: 'travel-1' },
        include: { images: true },
      });
    });
  });
});
