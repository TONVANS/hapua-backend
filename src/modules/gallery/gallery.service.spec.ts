import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { MediaService } from './media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaType, Visibility, Gallery } from '../../generated/prisma';

describe('GalleryService', () => {
  let service: GalleryService;

  const mockPrismaService = {
    activity: {
      findUnique: jest.fn(),
    },
    gallery: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const mockMediaService = {
    processAndSave: jest.fn(),
    deleteFileByUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<GalleryService>(GalleryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadAndCreate', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test-image-data'),
      destination: '',
      filename: '',
      path: '',
      stream: null as unknown as NodeJS.ReadableStream,
    };

    const uploadDto = {
      activityId: 'activity-uuid-1',
      title: 'Opening Ceremony',
      description: 'Photos from ceremony',
      visibility: Visibility.PUBLIC,
    };

    it('should throw BadRequestException if file is missing', async () => {
      await expect(service.uploadAndCreate(undefined as unknown as Express.Multer.File, uploadDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if activityId does not exist', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(service.uploadAndCreate(mockFile, uploadDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { id: uploadDto.activityId },
      });
    });

    it('should convert media and create gallery record with web accessible mediaUrl', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue({ id: 'activity-uuid-1', name: 'Annual Gala' });
      mockMediaService.processAndSave.mockResolvedValue({
        filename: 'uuid-1.webp',
        mediaUrl: '/api/media/uuid-1.webp',
        mediaType: MediaType.IMAGE,
        mimeType: 'image/webp',
        size: 512,
      });
      mockPrismaService.gallery.create.mockResolvedValue({
        id: 'gallery-uuid-1',
        activityId: uploadDto.activityId,
        mediaUrl: '/api/media/uuid-1.webp',
        mediaType: MediaType.IMAGE,
        visibility: Visibility.PUBLIC,
        title: 'Opening Ceremony',
        description: 'Photos from ceremony',
        createdAt: new Date(),
      } as Gallery);

      const result = await service.uploadAndCreate(mockFile, uploadDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('gallery-uuid-1');
      expect(result.mediaType).toBe(MediaType.IMAGE);
      expect(result.mediaUrl).toBe('/api/media/uuid-1.webp');
      expect(mockMediaService.processAndSave).toHaveBeenCalledWith(mockFile);
      expect(mockPrismaService.gallery.create).toHaveBeenCalledWith({
        data: {
          activityId: uploadDto.activityId,
          mediaUrl: '/api/media/uuid-1.webp',
          mediaType: MediaType.IMAGE,
          visibility: Visibility.PUBLIC,
          title: 'Opening Ceremony',
          description: 'Photos from ceremony',
        },
      });
    });

    it('should clean up uploaded file if database insertion fails', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue({ id: 'activity-uuid-1' });
      mockMediaService.processAndSave.mockResolvedValue({
        filename: 'uuid-1.webp',
        mediaUrl: '/api/media/uuid-1.webp',
        mediaType: MediaType.IMAGE,
      });
      mockPrismaService.gallery.create.mockRejectedValue(new Error('DB Connection Error'));

      await expect(service.uploadAndCreate(mockFile, uploadDto)).rejects.toThrow('DB Connection Error');
      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith(
        '/api/media/uuid-1.webp',
      );
    });
  });

  describe('remove', () => {
    it('should remove record and delete associated media file from external storage', async () => {
      mockPrismaService.gallery.findUnique.mockResolvedValue({
        id: 'gallery-1',
        mediaUrl: '/api/media/file.webp',
      });
      mockPrismaService.gallery.delete.mockResolvedValue({ id: 'gallery-1' });

      await service.remove('gallery-1');

      expect(mockPrismaService.gallery.delete).toHaveBeenCalledWith({ where: { id: 'gallery-1' } });
      expect(mockMediaService.deleteFileByUrl).toHaveBeenCalledWith('/api/media/file.webp');
    });
  });
});
