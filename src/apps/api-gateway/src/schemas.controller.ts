import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GraphQLSchemaDocumentation } from '../../../schemas/graphql.schemas';
import { KafkaMessageSchemas } from '../../../schemas/kafka.schemas';
import { SchemaEndpoints } from '../../../schemas';

@ApiTags('Schemas')
@Controller('schemas')
export class SchemasController {
  @Get('graphql')
  @ApiOperation({
    summary: 'Get GraphQL schema documentation',
    description:
      'Returns comprehensive GraphQL schema documentation with types, queries, and mutations',
  })
  @ApiResponse({
    status: 200,
    description: 'GraphQL schema documentation',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string' },
        types: { type: 'object' },
        queries: { type: 'object' },
        mutations: { type: 'object' },
      },
    },
  })
  getGraphQLSchema() {
    return GraphQLSchemaDocumentation;
  }

  @Get('kafka')
  @ApiOperation({
    summary: 'Get Kafka message schemas',
    description: 'Returns Kafka topic and message schemas for event-driven architecture',
  })
  @ApiResponse({
    status: 200,
    description: 'Kafka message schemas',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string' },
        topics: { type: 'object' },
        messageSchemas: { type: 'object' },
        consumerGroups: { type: 'object' },
      },
    },
  })
  getKafkaSchemas() {
    return KafkaMessageSchemas;
  }

  @Get()
  @ApiOperation({
    summary: 'Get all schema endpoints',
    description: 'Returns information about all available schema documentation endpoints',
  })
  @ApiResponse({
    status: 200,
    description: 'Schema endpoints information',
    schema: {
      type: 'object',
      properties: {
        openapi: { type: 'object' },
        graphql: { type: 'object' },
        kafka: { type: 'object' },
      },
    },
  })
  getSchemaEndpoints() {
    return SchemaEndpoints;
  }
}
