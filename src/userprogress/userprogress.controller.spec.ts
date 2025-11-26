import { Test, TestingModule } from '@nestjs/testing';
import { UserprogressController } from './userprogress.controller';
import { UserprogressService } from './userprogress.service';

describe('UserprogressController', () => {
  let controller: UserprogressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserprogressController],
      providers: [UserprogressService],
    }).compile();

    controller = module.get<UserprogressController>(UserprogressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
