import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  StreamableFile,
  Response,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CheckPolicies, PoliciesGuard } from '../../modules/auth/policies.guard';
import type { FastifyReply } from 'fastify';

interface UploadRequest {
  filename: string;
  contentType: string;
  content: string; // Base64 encoded content for simplicity
}

interface PresignedUploadRequest {
  filename: string;
  contentType: string;
}

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor() {}

  @Post('upload')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('create', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload a file',
    description: 'Upload a file to storage (accepts base64 encoded content)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        contentType: { type: 'string' },
        content: { type: 'string', description: 'Base64 encoded file content' }
      },
      required: ['filename', 'contentType', 'content']
    }
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(@Body() uploadData: UploadRequest) {
    if (!uploadData.filename || !uploadData.contentType || !uploadData.content) {
      throw new BadRequestException('Missing required fields: filename, contentType, content');
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    try {
      // Decode base64 content
      const buffer = Buffer.from(uploadData.content, 'base64');

      // Mock storage implementation
      console.log(`Mock uploading file ${fileId} with size ${buffer.length} bytes`);

      return {
        fileId,
        filename: uploadData.filename,
        contentType: uploadData.contentType,
        size: buffer.length,
      };
    } catch {
      throw new BadRequestException('Invalid base64 content');
    }
  }

  @Get('download/:fileId')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('read', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download a file',
    description: 'Download a file from storage by ID',
  })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async downloadFile(
    @Param('fileId') fileId: string,
    @Response({ passthrough: true }) reply: FastifyReply
  ) {
    try {
      // Mock download implementation
      const mockContent = `Mock file content for ${fileId}`;
      const buffer = Buffer.from(mockContent, 'utf-8');
      
      reply.header('Content-Type', 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${fileId}"`);
      
      return new StreamableFile(buffer);
    } catch {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }
  }

  @Get('metadata/:fileId')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('read', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get file metadata',
    description: 'Get metadata for a file by ID',
  })
  @ApiResponse({ status: 200, description: 'File metadata retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFileMetadata(@Param('fileId') fileId: string) {
    try {
      // Mock metadata check
      console.log(`Mock checking metadata for file ${fileId}`);
      
      return {
        fileId,
        filename: `file-${fileId}`,
        contentType: 'application/octet-stream',
        exists: true,
      };
    } catch {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }
  }

  @Delete(':fileId')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('delete', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a file',
    description: 'Delete a file from storage by ID',
  })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteFile(@Param('fileId') fileId: string) {
    try {
      // Mock delete implementation
      console.log(`Mock deleting file ${fileId}`);
      
      return {
        message: `File ${fileId} deleted successfully`,
        fileId,
      };
    } catch {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }
  }

  @Post('presigned-upload')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('create', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get presigned upload URL',
    description: 'Get a presigned URL for direct file upload',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        contentType: { type: 'string' }
      },
      required: ['filename', 'contentType']
    }
  })
  @ApiResponse({ status: 201, description: 'Presigned URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPresignedUpload(@Body() uploadData: PresignedUploadRequest) {
    if (!uploadData.filename || !uploadData.contentType) {
      throw new BadRequestException('Missing required fields: filename, contentType');
    }

    const fileId = `presigned-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    // In a real S3-compatible storage, this would generate actual presigned URLs
    const uploadUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/storage/upload`;

    return {
      fileId,
      uploadUrl,
      filename: uploadData.filename,
      contentType: uploadData.contentType,
      expiresIn: 3600, // 1 hour
    };
  }
}
