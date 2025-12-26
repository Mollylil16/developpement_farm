import { Module } from '@nestjs/common';
import { AgentLearningsController } from './agent-learnings.controller';
import { AgentLearningsService } from './agent-learnings.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AgentLearningsController],
  providers: [AgentLearningsService],
  exports: [AgentLearningsService],
})
export class AgentLearningsModule {}

