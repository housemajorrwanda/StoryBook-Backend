import { Test, TestingModule } from '@nestjs/testing';
import { UserprogressService } from './userprogress.service';

describe('UserprogressService', () => {
  let service: UserprogressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserprogressService],
    }).compile();

    service = module.get<UserprogressService>(UserprogressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
