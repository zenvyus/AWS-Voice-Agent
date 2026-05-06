import * as fs from 'fs';
import * as path from 'path';

/**
 * Phase 10: Contract Tests
 * Validates data shapes exchanged between services without making AWS calls.
 */

// Schema definitions (contracts between services)
const sessionRecordSchema = {
  required: ['contactId', 'startTime', 'status'],
  properties: {
    contactId: { type: 'string' },
    startTime: { type: 'string' }, // ISO 8601
    status: { type: 'string', enum: ['active', 'completed', 'error'] },
    ttl: { type: 'number' },
  },
};

const transcriptMetadataSchema = {
  required: ['contactId', 'timestamp', 'format'],
  properties: {
    contactId: { type: 'string' },
    timestamp: { type: 'string' }, // ISO 8601
    format: { type: 'string', enum: ['json', 'text'] },
  },
};

function validateSchema(
  obj: Record<string, unknown>,
  schema: { required: string[]; properties: Record<string, { type: string; enum?: string[] }> },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  for (const field of schema.required) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check types and enums
  for (const [field, spec] of Object.entries(schema.properties)) {
    if (field in obj) {
      const value = obj[field];
      if (spec.type === 'string' && typeof value !== 'string') {
        errors.push(`Field '${field}' should be string, got ${typeof value}`);
      }
      if (spec.type === 'number' && typeof value !== 'number') {
        errors.push(`Field '${field}' should be number, got ${typeof value}`);
      }
      if (spec.enum && !spec.enum.includes(value as string)) {
        errors.push(`Field '${field}' value '${value}' not in enum: ${spec.enum.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

describe('Phase 10: Contract Tests', () => {
  // Story 10.2 AC1: Lambda → DynamoDB session schema
  describe('Session Record Contract', () => {
    test('valid session record passes schema validation', () => {
      const validRecord = {
        contactId: 'abc-123-def',
        startTime: '2026-05-06T15:00:00Z',
        status: 'active',
        ttl: 1720000000,
      };
      const result = validateSchema(validRecord, sessionRecordSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('missing required fields fail validation', () => {
      const invalidRecord = { contactId: 'abc-123' };
      const result = validateSchema(invalidRecord as Record<string, unknown>, sessionRecordSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: startTime');
      expect(result.errors).toContain('Missing required field: status');
    });

    test('invalid status enum fails validation', () => {
      const invalidRecord = {
        contactId: 'abc-123',
        startTime: '2026-05-06T15:00:00Z',
        status: 'invalid_status',
        ttl: 123,
      };
      const result = validateSchema(invalidRecord, sessionRecordSchema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not in enum');
    });

    test('wrong type for ttl fails validation', () => {
      const invalidRecord = {
        contactId: 'abc-123',
        startTime: '2026-05-06T15:00:00Z',
        status: 'active',
        ttl: 'not-a-number',
      };
      const result = validateSchema(invalidRecord as Record<string, unknown>, sessionRecordSchema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('should be number');
    });
  });

  // Story 10.2 AC2: Orchestrator → S3 transcript schema
  describe('Transcript Metadata Contract', () => {
    test('valid transcript metadata passes schema validation', () => {
      const validMetadata = {
        contactId: 'abc-123-def',
        timestamp: '2026-05-06T15:30:00Z',
        format: 'json',
      };
      const result = validateSchema(validMetadata, transcriptMetadataSchema);
      expect(result.valid).toBe(true);
    });

    test('missing required fields fail validation', () => {
      const invalidMetadata = { contactId: 'abc' };
      const result = validateSchema(
        invalidMetadata as Record<string, unknown>,
        transcriptMetadataSchema,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: timestamp');
      expect(result.errors).toContain('Missing required field: format');
    });

    test('invalid format enum fails validation', () => {
      const invalidMetadata = {
        contactId: 'abc',
        timestamp: '2026-05-06T15:30:00Z',
        format: 'xml',
      };
      const result = validateSchema(invalidMetadata, transcriptMetadataSchema);
      expect(result.valid).toBe(false);
    });
  });

  // Story 10.2 AC3: Agent tools response contract
  describe('Agent Tools API Contract', () => {
    let apiSchema: Record<string, unknown>;

    beforeAll(() => {
      const schemaPath = path.join(
        __dirname,
        '../../lib/constructs/agent-tools-lambda/api-schema.json',
      );
      apiSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    });

    test('API schema is valid OpenAPI 3.0', () => {
      expect(apiSchema).toHaveProperty('openapi');
      expect((apiSchema as { openapi: string }).openapi).toMatch(/^3\.0/);
      expect(apiSchema).toHaveProperty('info');
      expect(apiSchema).toHaveProperty('paths');
    });

    test('searchFlights endpoint exists with required parameters', () => {
      const paths = apiSchema['paths'] as Record<string, Record<string, unknown>>;
      expect(paths).toHaveProperty('/searchFlights');
      const endpoint = paths['/searchFlights']['get'] as Record<string, unknown>;
      const params = endpoint['parameters'] as Array<{ name: string; required: boolean }>;
      const requiredParams = params.filter((p) => p.required).map((p) => p.name);
      expect(requiredParams).toContain('origin');
      expect(requiredParams).toContain('destination');
      expect(requiredParams).toContain('date');
    });

    test('createBooking endpoint has required request body fields', () => {
      const paths = apiSchema['paths'] as Record<string, Record<string, unknown>>;
      const endpoint = paths['/createBooking']['post'] as Record<string, unknown>;
      const reqBody = endpoint['requestBody'] as Record<string, unknown>;
      const content = reqBody['content'] as Record<string, unknown>;
      const jsonSchema = (content['application/json'] as Record<string, unknown>)[
        'schema'
      ] as Record<string, unknown>;
      expect(jsonSchema['required']).toContain('flightNumber');
      expect(jsonSchema['required']).toContain('passengerName');
      expect(jsonSchema['required']).toContain('date');
    });

    test('getBooking response includes expected fields', () => {
      const paths = apiSchema['paths'] as Record<string, Record<string, unknown>>;
      const endpoint = paths['/getBooking']['get'] as Record<string, unknown>;
      const responses = endpoint['responses'] as Record<string, unknown>;
      const response200 = responses['200'] as Record<string, unknown>;
      const content = response200['content'] as Record<string, unknown>;
      const schema = (content['application/json'] as Record<string, unknown>)['schema'] as Record<
        string,
        unknown
      >;
      const properties = schema['properties'] as Record<string, unknown>;
      expect(Object.keys(properties)).toEqual(
        expect.arrayContaining(['orderId', 'flightNumber', 'passengerName', 'status']),
      );
    });

    test('selectSeat endpoint requires orderId and seatNumber', () => {
      const paths = apiSchema['paths'] as Record<string, Record<string, unknown>>;
      const endpoint = paths['/selectSeat']['post'] as Record<string, unknown>;
      const reqBody = endpoint['requestBody'] as Record<string, unknown>;
      const content = reqBody['content'] as Record<string, unknown>;
      const jsonSchema = (content['application/json'] as Record<string, unknown>)[
        'schema'
      ] as Record<string, unknown>;
      expect(jsonSchema['required']).toContain('orderId');
      expect(jsonSchema['required']).toContain('seatNumber');
    });
  });
});
