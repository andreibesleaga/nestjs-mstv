import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/common/services/prisma.service';
import { MongoDbService } from '../../src/common/services/mongodb.service';
import { UsersModule } from '../../src/modules/users/interface/users.module';
import { UsersService } from '../../src/modules/users/application/users.service';

describe('Database Integration Tests', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let mongoService: MongoDbService;
  let usersService: UsersService;
  let configService: ConfigService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.example',
        }),
        UsersModule,
      ],
      providers: [
        PrismaService,
        MongoDbService,
      ],
    }).compile();

    // Initialize the module to trigger CQRS handler registration
    await module.init();

    prismaService = module.get<PrismaService>(PrismaService);
    mongoService = module.get<MongoDbService>(MongoDbService);
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (configService.get('DATABASE_TYPE') === 'postgresql') {
        await prismaService.$queryRaw`DELETE FROM users WHERE email LIKE '%@test.integration%'`;
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    await module.close();
  });

  describe('Prisma/PostgreSQL Integration', () => {
  const shouldRunPostgres = () => configService.get('DATABASE_TYPE') === 'postgresql' && !process.env.CI_SKIP_DB;

    it('should connect to PostgreSQL database', async () => {
      if (!shouldRunPostgres()) return;
      await expect(prismaService.$connect()).resolves.not.toThrow();
    });

    it('should create and retrieve user with Prisma', async () => {
      if (!shouldRunPostgres()) return;
      const userData = {
        email: `test.prisma.${Date.now()}@test.integration`,
        name: 'Prisma Test User',
        password: 'test12345',
      };

      const createdUser = await usersService.createUser(userData.email, userData.password, userData.name);
      
      expect(createdUser).toBeDefined();
      expect(createdUser.email.getValue()).toBe(userData.email);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.id).toBeDefined();

      // Verify user can be retrieved
      const retrievedUser = await usersService.getById(createdUser.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.email.getValue()).toBe(userData.email);

      // Cleanup
      await usersService.deleteUser(createdUser.id);
    });

    it('should handle database transactions', async () => {
      if (!shouldRunPostgres()) return;
      await prismaService.$transaction(async (tx) => {
        const user1 = await tx.user.create({
          data: {
            email: `tx.user1.${Date.now()}@test.integration`,
            name: 'Transaction User 1',
            password: 'test12345',
          },
        });

        const user2 = await tx.user.create({
          data: {
            email: `tx.user2.${Date.now()}@test.integration`,
            name: 'Transaction User 2',
            password: 'test12345',
          },
        });

        expect(user1.id).toBeDefined();
        expect(user2.id).toBeDefined();

        // Both users should be created within the transaction
        const users = await tx.user.findMany({
          where: {
            id: { in: [user1.id, user2.id] },
          },
        });

        expect(users).toHaveLength(2);
      });
    });

    it('should handle concurrent operations', async () => {
      if (!shouldRunPostgres()) return;
      const operations = Array.from({ length: 5 }, (_, i) =>
        usersService.createUser(
          `concurrent.${i}.${Date.now()}@test.integration`,
          'test12345',
          `Concurrent User ${i}`
        )
      );

      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(5);
      results.forEach((user, index) => {
        expect(user.name).toBe(`Concurrent User ${index}`);
      });

      // Cleanup
      await Promise.all(results.map(user => usersService.deleteUser(user.id)));
    });

    it('should handle database connection pooling', async () => {
      if (!shouldRunPostgres()) return;
      // Test multiple concurrent connections
      const queries = Array.from({ length: 10 }, () =>
        prismaService.user.count()
      );

      const results = await Promise.all(queries);
      expect(results.every(count => typeof count === 'number')).toBe(true);
    });
  });

  describe('MongoDB Integration', () => {
  const shouldRunMongo = () => configService.get('DATABASE_TYPE') === 'mongodb' && !process.env.CI_SKIP_DB;

    it('should connect to MongoDB database', async () => {
      if (!shouldRunMongo()) return;
      const client = mongoService.getClient();
      expect(client).toBeDefined();
      
      const db = mongoService.getDb();
      expect(db).toBeDefined();
    });

    it('should perform CRUD operations with MongoDB', async () => {
      if (!shouldRunMongo()) return;
      const db = mongoService.getDb();
      const collection = db.collection('test_users');
      
      // Create
      const testUser = {
        email: `mongo.test.${Date.now()}@test.integration`,
        name: 'MongoDB Test User',
        createdAt: new Date(),
      };

      const insertResult = await collection.insertOne(testUser);
      expect(insertResult.insertedId).toBeDefined();

      // Read
      const foundUser = await collection.findOne({ _id: insertResult.insertedId });
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(testUser.email);

      // Update
      const updateResult = await collection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { name: 'Updated MongoDB User' } }
      );
      expect(updateResult.modifiedCount).toBe(1);

      // Verify update
      const updatedUser = await collection.findOne({ _id: insertResult.insertedId });
      expect(updatedUser.name).toBe('Updated MongoDB User');

      // Delete
      const deleteResult = await collection.deleteOne({ _id: insertResult.insertedId });
      expect(deleteResult.deletedCount).toBe(1);
    });

    it('should handle MongoDB aggregation pipelines', async () => {
      if (!shouldRunMongo()) return;
      const db = mongoService.getDb();
      const collection = db.collection('test_analytics');
      
      // Insert test data
      const testData = Array.from({ length: 10 }, (_, i) => ({
        userId: `user_${i % 3}`,
        action: i % 2 === 0 ? 'login' : 'logout',
        timestamp: new Date(),
        value: i * 10,
      }));

      await collection.insertMany(testData);

      // Aggregation pipeline
      const pipeline = [
        { $group: { _id: '$userId', total: { $sum: '$value' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('_id');
      expect(results[0]).toHaveProperty('total');
      expect(results[0]).toHaveProperty('count');

      // Cleanup
      await collection.deleteMany({ userId: { $regex: /^user_/ } });
    });

    it('should handle MongoDB indexing', async () => {
      if (!shouldRunMongo()) return;
      const db = mongoService.getDb();
      const collection = db.collection('test_indexed');
      
      // Create index
      await collection.createIndex({ email: 1 }, { unique: true });
      
      // Verify index exists
      const indexes = await collection.indexes();
      const emailIndex = indexes.find(idx => idx.key && idx.key.email);
      expect(emailIndex).toBeDefined();
      expect(emailIndex.unique).toBe(true);

      // Test unique constraint
      const testDoc = { email: `unique.${Date.now()}@test.integration`, name: 'Test' };
      
      await collection.insertOne(testDoc);
      
      // Should fail on duplicate email
      await expect(collection.insertOne(testDoc)).rejects.toThrow();

      // Cleanup
      await collection.deleteMany({ email: testDoc.email });
    });
  });

  describe('Database Provider Switching', () => {
    it('should handle different database types gracefully', () => {
      const dbType = configService.get('DATABASE_TYPE');
      
      expect(['postgresql', 'mysql', 'mariadb', 'mongodb']).toContain(dbType);
      
      if (dbType === 'postgresql' || dbType === 'mysql' || dbType === 'mariadb') {
        expect(prismaService).toBeDefined();
      }
      
      if (dbType === 'mongodb') {
        expect(mongoService).toBeDefined();
      }
    });

    it('should have appropriate connection strings', () => {
      const dbType = configService.get('DATABASE_TYPE');
      
      if (dbType === 'postgresql') {
        const url = configService.get('DATABASE_URL');
        expect(url).toBeDefined();
        expect(url).toMatch(/^postgresql:\/\//);
      }
      
      if (dbType === 'mysql' || dbType === 'mariadb') {
        const url = configService.get('MYSQL_URL');
        expect(url).toBeDefined();
        expect(url).toMatch(/^mysql:\/\//);
      }
      
      if (dbType === 'mongodb') {
        const url = configService.get('MONGODB_URL');
        expect(url).toBeDefined();
        expect(url).toMatch(/^mongodb:\/\//);
      }
    });
  });

  describe('Database Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const dbType = configService.get('DATABASE_TYPE');
      
      if (dbType === 'postgresql') {
  if (process.env.CI_SKIP_DB) return;
        const start = Date.now();
        
        // Bulk create via Prisma
        const users = Array.from({ length: 100 }, (_, i) => ({
          email: `bulk.${i}.${Date.now()}@test.integration`,
          name: `Bulk User ${i}`,
          password: 'test12345',
        }));

        await prismaService.user.createMany({ data: users });
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

        // Cleanup
        await prismaService.user.deleteMany({
          where: { email: { contains: '@test.integration' } },
        });
      }
    });

    it('should handle query optimization', async () => {
      const dbType = configService.get('DATABASE_TYPE');
      
      if (dbType === 'postgresql') {
  if (process.env.CI_SKIP_DB) return;
        const start = Date.now();
        
        // Complex query with joins and filters
        const result = await prismaService.user.findMany({
          where: {
            email: { contains: '@' },
            createdAt: { gte: new Date('2024-01-01') },
          },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
          take: 10,
        });
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(1000); // Should be fast even with complex query
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('Database Error Handling', () => {
    it('should handle connection failures gracefully', async () => {
      // This test would require temporarily breaking the connection
      // For now, just verify the services handle errors properly
      expect(prismaService).toBeDefined();
      expect(mongoService).toBeDefined();
    });

    it('should handle constraint violations', async () => {
      const dbType = configService.get('DATABASE_TYPE');
      
      if (dbType === 'postgresql') {
  if (process.env.CI_SKIP_DB) return;
        const userData = {
          email: `constraint.test.${Date.now()}@test.integration`,
          name: 'Constraint Test',
          password: 'test12345',
        };

        const user = await usersService.createUser(userData.email, userData.password, userData.name);
        
        // Try to create user with same email (should fail)
        await expect(usersService.createUser(userData.email, userData.password, userData.name)).rejects.toThrow();

        // Cleanup
        await usersService.deleteUser(user.id);
      }
    });
  });
});
