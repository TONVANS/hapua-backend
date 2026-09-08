import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaType } from '../../generated/prisma';
import sharp from 'sharp';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'EXTERNAL_STORAGE_PATH') return 'D:/uploads/hapua/galleries';
              if (key === 'MEDIA_URL_PREFIX') return '/api/media';
              if (key === 'BASE_URL') return 'http://localhost:3001';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectMediaType', () => {
    it('should detect image mime types as IMAGE', () => {
      expect(service.detectMediaType('image/jpeg')).toBe(MediaType.IMAGE);
      expect(service.detectMediaType('image/png')).toBe(MediaType.IMAGE);
      expect(service.detectMediaType('image/webp')).toBe(MediaType.IMAGE);
      expect(service.detectMediaType('image/gif')).toBe(MediaType.IMAGE);
    });

    it('should detect video mime types as VIDEO', () => {
      expect(service.detectMediaType('video/mp4')).toBe(MediaType.VIDEO);
      expect(service.detectMediaType('video/webm')).toBe(MediaType.VIDEO);
      expect(service.detectMediaType('video/quicktime')).toBe(MediaType.VIDEO);
    });

    it('should throw BadRequestException for unsupported mime types', () => {
      expect(() => service.detectMediaType('application/pdf')).toThrow(BadRequestException);
      expect(() => service.detectMediaType('text/plain')).toThrow(BadRequestException);
      expect(() => service.detectMediaType('')).toThrow(BadRequestException);
    });
  });

  describe('validateFileSize', () => {
    it('should accept valid file sizes', () => {
      expect(() => service.validateFileSize(5 * 1024 * 1024, MediaType.IMAGE)).not.toThrow();
      expect(() => service.validateFileSize(50 * 1024 * 1024, MediaType.VIDEO)).not.toThrow();
    });

    it('should throw BadRequestException if file exceeds limit', () => {
      expect(() => service.validateFileSize(30 * 1024 * 1024, MediaType.IMAGE)).toThrow(BadRequestException);
      expect(() => service.validateFileSize(200 * 1024 * 1024, MediaType.VIDEO)).toThrow(BadRequestException);
    });
  });

  describe('formatMediaUrl', () => {
    it('should format full media URL with BASE_URL and MEDIA_URL_PREFIX', () => {
      const url = service.formatMediaUrl('test-uuid.webp');
      expect(url).toBe('http://localhost:3001/api/media/test-uuid.webp');
    });
  });

  describe('processAndSave image conversion', () => {
    it('should convert an image to webp format using sharp and save to external directory', async () => {
      // Create a valid 10x10 PNG image buffer using sharp
      const testBuffer = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: testBuffer.length,
        buffer: testBuffer,
        destination: '',
        filename: '',
        path: '',
        stream: null as unknown as NodeJS.ReadableStream,
      };

      const result = await service.processAndSave(mockFile);

      expect(result).toBeDefined();
      expect(result.mediaType).toBe(MediaType.IMAGE);
      expect(result.filename.endsWith('.webp')).toBe(true);
      expect(result.mediaUrl).toContain('/api/media/');
      expect(result.mimeType).toBe('image/webp');

      // Cleanup created file
      await service.deleteFileByUrl(result.mediaUrl);
    });
  });
});
