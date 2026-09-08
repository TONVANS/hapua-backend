import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { MediaService } from '../gallery/media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaType } from '../../generated/prisma';

describe('HotelService', () => {
  let service: HotelService;

  const mockPrismaService = {
    hotelRecommend: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    hotelImage: {
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
        HotelService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<HotelService>(HotelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCoverFile: Express.Multer.File = {
      fieldname: 'coverImage',
      originalname: 'cover.jpg',
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
      originalname: 'gallery1.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('gallery-data'),
      destination: '',
      filename: '',
      path: '',
      stream: null as unknown as NodeJS.ReadableStream,
    };

    it('should create hotel with uploaded cover image and gallery images using nested write', async () => {
      mockMediaService.processAndSave
        .mockResolvedValueOnce({
          filename: 'cover.webp',
          mediaUrl: '/api/media/cover.webp',
          mediaType: MediaType.IMAGE,
        })
        .mockResolvedValueOnce({
          filename: 'gallery1.webp',
          mediaUrl: '/api/media/gallery1.webp',
          mediaType: MediaType.IMAGE,
        });

      const expectedHotel = {
        id: 'hotel-1',
        name: 'Amantaka',
        address: 'Luang Prabang',
        coverImage: '/api/media/cover.webp',
        images: [{ id: 'img-1', imageUrl: '/api/media/gallery1.webp', order: 0 }],
      };

      mockPrismaService.hotelRecommend.create.mockResolvedValue(expectedHotel);

      const result = await service.create(
        {
          name: 'Amantaka',
          address: 'Luang Prabang',
          starRating: 5,
        },
        {
          coverImage: [mockCoverFile],
          images: [mockGalleryFile],
        },
      );

      expect(result).toEqual(expectedHotel);
      expect(mockMediaService.processAndSave).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.hotelRecommend.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Amantaka',
          address: 'Luang Prabang',
          coverImage: '/api/media/cover.webp',
          images: {
            create: [{ imageUrl: '/api/media/gallery1.webp', order: 0 }],
          },
        }),
        include: { images: { orderBy: { order: 'asc' } } },
      });
    });

    it('should clean up newly uploaded files if database creation fails', async () => {
      mockMediaService.processAndSave.mockResolvedValue({
        filename: 'cover.webp',
        mediaUrl: '/api/media/cover.webp',
        mediaType: MediaType.IMAGE,
      });

      mockPrismaService.hotelRecommend.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.create(
          { name: 'Hotel Fail', address: 'Vientiane' },
          { coverImage: [mockCoverFile] },
        ),
      ).rejects.toThrow('Database error');

      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/cover.webp',
      );
    });
  });

  describe('findOne', () => {
    it('should return hotel with images', async () => {
      const mockHotel = {
        id: 'hotel-1',
        name: 'Amantaka',
        images: [],
      };
      mockPrismaService.hotelRecommend.findUnique.mockResolvedValue(mockHotel);

      const result = await service.findOne('hotel-1');
      expect(result).toEqual(mockHotel);
      expect(mockPrismaService.hotelRecommend.findUnique).toHaveBeenCalledWith({
        where: { id: 'hotel-1' },
        include: { images: { orderBy: { order: 'asc' } } },
      });
    });

    it('should throw NotFoundException if hotel not found', async () => {
      mockPrismaService.hotelRecommend.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should replace cover image and delete old cover file', async () => {
      const existingHotel = {
        id: 'hotel-1',
        name: 'Amantaka',
        coverImage: '/api/media/old-cover.webp',
        images: [],
      };
      mockPrismaService.hotelRecommend.findUnique.mockResolvedValue(existingHotel);
      mockMediaService.processAndSave.mockResolvedValue({
        filename: 'new-cover.webp',
        mediaUrl: '/api/media/new-cover.webp',
        mediaType: MediaType.IMAGE,
      });

      const updatedHotel = {
        ...existingHotel,
        coverImage: '/api/media/new-cover.webp',
      };
      mockPrismaService.hotelRecommend.update.mockResolvedValue(updatedHotel);

      const mockNewCoverFile = {
        buffer: Buffer.from('new-cover'),
      } as Express.Multer.File;

      const result = await service.update(
        'hotel-1',
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
    it('should delete hotel and physical files from storage', async () => {
      const existingHotel = {
        id: 'hotel-1',
        name: 'Amantaka',
        coverImage: '/api/media/cover.webp',
        images: [
          { id: 'img-1', imageUrl: '/api/media/gallery1.webp' },
          { id: 'img-2', imageUrl: '/api/media/gallery2.webp' },
        ],
      };
      mockPrismaService.hotelRecommend.findUnique.mockResolvedValue(existingHotel);
      mockPrismaService.hotelRecommend.delete.mockResolvedValue(existingHotel);

      await service.remove('hotel-1');

      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/cover.webp',
      );
      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/gallery1.webp',
      );
      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/gallery2.webp',
      );
      expect(mockPrismaService.hotelRecommend.delete).toHaveBeenCalledWith({
        where: { id: 'hotel-1' },
        include: { images: true },
      });
    });
  });
});
