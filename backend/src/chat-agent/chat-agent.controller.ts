import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatAgentService } from './chat-agent.service';
import { KouakouRateLimitGuard } from './guards/kouakou-rate-limit.guard';
import { Response } from 'express';

@ApiTags('Chat Agent (Kouakou)')
@Controller('kouakou')
@UseGuards(JwtAuthGuard, KouakouRateLimitGuard)
@ApiBearerAuth()
export class ChatAgentController {
  constructor(private readonly chatAgentService: ChatAgentService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Envoie un message à Kouakou (agent conversationnel Gemini)' })
  async chat(
    @Body()
    body: {
      message?: string;
      history?: any[];
      projectId?: string;
      projetId?: string;
      conversationId?: string;
      generationConfig?: Record<string, unknown>;
    },
    @Request() req: any,
  ) {
    if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
      throw new BadRequestException('message est requis');
    }

    // projectId est optionnel - certains profils (buyer, veterinarian, technician) peuvent ne pas avoir de projet
    const projectId = body.projectId || body.projetId || req.user?.projetId || null;

    return this.chatAgentService.handleFunctionCallingMessage(
      {
        message: body.message,
        history: Array.isArray(body.history) ? body.history : undefined,
        projectId,
        generationConfig: body.generationConfig,
        conversationId: body.conversationId,
      },
      req.user,
    );
  }

  @Get('chat/stream')
  @ApiOperation({ summary: 'Streaming Server-Sent Events des réponses de Kouakou' })
  async streamChat(
    @Query('message') message: string,
    @Query('projectId') projectId?: string,
    @Query('history') historyRaw?: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!message) {
      res.status(400).json({ message: 'message est requis' });
      return;
    }

    // projectId est optionnel - utiliser celui de l'utilisateur ou null
    const effectiveProjectId = projectId || req.user?.projetId || null;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      await this.chatAgentService.streamResponse(
        {
          message,
          projectId: effectiveProjectId,
          history: this.decodeHistory(historyRaw),
        },
        req.user,
        {
          onTextChunk: ({ text }) => sendEvent('message', { text }),
          onFunctionCall: ({ name, args }) => sendEvent('function_call', { name, args }),
          onFunctionResult: ({ name, args, result }) =>
            sendEvent('function_result', { name, args, result }),
        },
        abortController.signal,
      );
      sendEvent('done', { ok: true });
    } catch (error) {
      const messageErreur =
        error instanceof Error ? error.message : 'Erreur inattendue lors du streaming';
      sendEvent('error', { message: messageErreur });
    } finally {
      res.end();
    }
  }

  private decodeHistory(raw?: string): any[] | undefined {
    if (!raw) {
      return undefined;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
}

