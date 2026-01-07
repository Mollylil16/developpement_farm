import { Module } from '@nestjs/common';
import { ChatAgentController } from './chat-agent.controller';
import { ChatAgentService } from './chat-agent.service';
import { FinanceModule } from '../finance/finance.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { KouakouRateLimitGuard } from './guards/kouakou-rate-limit.guard';

@Module({
  imports: [FinanceModule, KnowledgeBaseModule],
  controllers: [ChatAgentController],
  providers: [ChatAgentService, KouakouRateLimitGuard],
  exports: [ChatAgentService],
})
export class ChatAgentModule {}

